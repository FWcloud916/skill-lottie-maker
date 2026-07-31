#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import YAML from "yaml";

import { assertKebab, parseArgs, writeJson } from "./lib/io.mjs";
import {
  createAnimation,
  inspectAnimation,
  loadBundle,
  validateBundle,
} from "./lib/lottie.mjs";
import { PROFILES, resolveProfile } from "./lib/profiles.mjs";
import { ffmpegArgs } from "./lib/media.mjs";
import { renderSamples } from "./lib/render.mjs";

const execFileAsync = promisify(execFile);

function usage() {
  return `usage:
  lottie-maker.mjs init --id <id> --profile <profile> --out <dir> [--title <copy>] [--intent <goal>] [--dry-run]
    custom also requires --width <px> --height <px> --fps <n> --duration <seconds>
  lottie-maker.mjs clone <bundle|animation.json> --id <id> --out <dir> [--dry-run]
  lottie-maker.mjs compare <before> <after> [--json]
  lottie-maker.mjs inspect <bundle|animation.json> [--json]
  lottie-maker.mjs validate <bundle|animation.json> [--json]
  lottie-maker.mjs render <bundle|animation.json> --out <dir> [--all-frames] [--allow-large-render] [--mp4|--gif]
  lottie-maker.mjs verify <bundle|animation.json> --out <dir> [--full] [--allow-large-render]

profiles: ${[...Object.keys(PROFILES), "custom"].join(", ")}`;
}

function required(options, key) {
  const value = options[key];
  if (typeof value !== "string" || !value)
    throw new Error(`--${key.replaceAll("_", "-")} is required`);
  return value;
}

async function pathExists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function collectCloneEntries(source, relative = "", entries = []) {
  const target = path.join(source, relative);
  const info = await lstat(target);
  if (info.isSymbolicLink())
    throw new Error(`clone source must not contain symlinks: ${target}`);
  if (info.isFile()) {
    entries.push({ type: "file", relative });
    return entries;
  }
  if (!info.isDirectory())
    throw new Error(`clone source contains an unsupported entry: ${target}`);
  if (relative) entries.push({ type: "directory", relative });
  for (const name of (await readdir(target)).sort()) {
    await collectCloneEntries(source, path.join(relative, name), entries);
  }
  return entries;
}

async function clone(options) {
  const input = options._[0];
  if (!input) throw new Error("input path is required");
  const id = assertKebab(required(options, "id"));
  const source = path.resolve(input);
  const sourceInfo = await lstat(source);
  if (sourceInfo.isSymbolicLink())
    throw new Error("clone source must not be a symlink");
  const resolvedSource = await realpath(source);
  const sourceBundle = await loadBundle(resolvedSource);
  const outputRoot = path.resolve(required(options, "out"));
  let resolvedOutputRoot;
  try {
    resolvedOutputRoot = await realpath(outputRoot);
  } catch (error) {
    if (error.code === "ENOENT")
      throw new Error("clone output directory must already exist");
    throw error;
  }
  const bundleRoot = path.join(resolvedOutputRoot, id);
  if (sourceInfo.isDirectory()) {
    const relativeDestination = path.relative(resolvedSource, bundleRoot);
    if (
      !relativeDestination ||
      (!relativeDestination.startsWith("..") &&
        !path.isAbsolute(relativeDestination))
    ) {
      throw new Error("destination must not be inside the source bundle");
    }
  }
  if (await pathExists(bundleRoot))
    throw new Error(`destination already exists: ${bundleRoot}`);

  const sourceReport = await inspectAnimation(sourceBundle);
  const entries = sourceInfo.isDirectory()
    ? await collectCloneEntries(resolvedSource)
    : [
        { type: "file", relative: "animation.json", source },
        ...sourceReport.assets
          .filter((asset) => asset.status === "resolved")
          .map((asset) => ({
            type: "file",
            relative: asset.reference,
            source: asset.path,
          })),
      ];
  const unresolvedAssets = sourceReport.assets.filter(
    (asset) => asset.status !== "resolved",
  );
  const unresolvedFonts = sourceReport.fonts.filter(
    (font) => font.status !== "resolved",
  );
  if (
    !sourceInfo.isDirectory() &&
    (unresolvedAssets.length || unresolvedFonts.length)
  ) {
    const unresolved = [...unresolvedAssets, ...unresolvedFonts];
    throw new Error(
      `standalone source has unresolved assets or fonts; make an explicit asset-copy plan: ${unresolved.map((asset) => asset.reference).join(", ")}`,
    );
  }
  const preview = {
    status: options.dry_run ? "dry-run" : "created",
    source,
    bundle: bundleRoot,
    files: entries.filter((entry) => entry.type === "file").length,
    source_sha256: sourceReport.sha256,
  };
  if (options.dry_run) {
    process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
    return;
  }

  await mkdir(bundleRoot, { recursive: true });
  for (const entry of entries) {
    const destination = path.join(bundleRoot, entry.relative);
    if (entry.type === "directory")
      await mkdir(destination, { recursive: true });
    else {
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(
        entry.source ?? path.join(resolvedSource, entry.relative),
        destination,
      );
    }
  }
  const clonedReport = await inspectAnimation(await loadBundle(bundleRoot));
  if (clonedReport.sha256 !== preview.source_sha256)
    throw new Error("cloned animation hash does not match source");
  process.stdout.write(
    `${JSON.stringify({ ...preview, cloned_sha256: clonedReport.sha256 }, null, 2)}\n`,
  );
}

function pointerToken(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function changedPaths(before, after, pointer = "", changes = []) {
  if (Object.is(before, after)) return changes;
  const beforeObject = before && typeof before === "object";
  const afterObject = after && typeof after === "object";
  if (
    !beforeObject ||
    !afterObject ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    changes.push(pointer || "/");
    return changes;
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    const child = `${pointer}/${pointerToken(key)}`;
    if (!Object.hasOwn(before, key) || !Object.hasOwn(after, key))
      changes.push(child);
    else changedPaths(before[key], after[key], child, changes);
  }
  return changes;
}

async function compare(options) {
  const [beforeInput, afterInput] = options._;
  if (!beforeInput || !afterInput)
    throw new Error("before and after paths are required");
  const before = await loadBundle(beforeInput);
  const after = await loadBundle(afterInput);
  const paths = changedPaths(before.animation, after.animation);
  const report = {
    status: paths.length ? "changed" : "identical",
    before_sha256: (await inspectAnimation(before)).sha256,
    after_sha256: (await inspectAnimation(after)).sha256,
    changed_path_count: paths.length,
    changed_paths: paths.slice(0, 2000),
    truncated: paths.length > 2000,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function init(options) {
  const id = assertKebab(required(options, "id"));
  const profileName = required(options, "profile");
  const outputRoot = path.resolve(required(options, "out"));
  const bundleRoot = path.join(outputRoot, id);
  if (await pathExists(bundleRoot))
    throw new Error(`destination already exists: ${bundleRoot}`);
  const brief = {
    version: 1,
    id,
    profile: profileName,
    ...(profileName === "custom"
      ? {
          canvas: {
            width: Number(required(options, "width")),
            height: Number(required(options, "height")),
          },
          fps: Number(required(options, "fps")),
          duration_seconds: Number(required(options, "duration")),
        }
      : {}),
    poster_frame: null,
    loop: profileName === "icon",
    safe_area: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
    motion: {
      intent: options.intent ?? "Explain one clear idea",
      personality: "restrained",
      reduced_motion: "hold the poster state",
    },
    copy: { title: options.title ?? "Replace me" },
    palette: {
      background: [0.976, 0.98, 0.984, 1],
      foreground: [0.082, 0.145, 0.267, 1],
    },
    fonts: [
      {
        name: "Noto Sans CJK TC",
        family: "Noto Sans CJK TC",
        style: "Regular",
        path: "assets/fonts/NotoSansCJKtc-Regular.otf",
      },
    ],
    assets: [],
  };
  const profile = resolveProfile(brief);
  brief.poster_frame = Math.max(0, Math.round(profile.frameCount * 0.75));
  const animation = createAnimation(brief, profile);
  const motion = `# ${id} motion rationale\n\n- Intent: ${brief.motion.intent}\n- Profile: ${profile.profile} (${profile.width}x${profile.height}, ${profile.fps} FPS, ${profile.duration}s)\n- Focal group: title\n- Poster frame: ${brief.poster_frame}\n- Assets: bundled Noto Sans CJK TC font only\n- QA: inspect entrance, stable hold, text shaping, safe area, final frame, and deterministic hashes.\n`;
  const fontSource = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../assets/fonts/NotoSansCJKtc-Regular.otf",
  );
  if (options.dry_run) {
    process.stdout.write(
      `${JSON.stringify({ status: "dry-run", would_create: bundleRoot, brief, files: ["brief.yaml", "animation.json", "motion.md", "assets/fonts/NotoSansCJKtc-Regular.otf"] }, null, 2)}\n`,
    );
    return;
  }
  await mkdir(path.join(bundleRoot, "assets", "fonts"), { recursive: true });
  await writeFile(path.join(bundleRoot, "brief.yaml"), YAML.stringify(brief));
  await writeJson(path.join(bundleRoot, "animation.json"), animation);
  await writeFile(path.join(bundleRoot, "motion.md"), motion);
  await writeFile(
    path.join(bundleRoot, "assets", "fonts", "NotoSansCJKtc-Regular.otf"),
    await readFile(fontSource),
  );
  process.stdout.write(
    `${JSON.stringify({ status: "created", bundle: bundleRoot })}\n`,
  );
}

function printReport(report, json) {
  if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    process.stdout.write(
      `status=${report.status}\nframes=${report.frame_count}\nlayers=${report.layer_count}\nsha256=${report.sha256}\n`,
    );
    for (const warning of report.warnings ?? [])
      process.stdout.write(`warning: ${warning}\n`);
    for (const error of report.errors ?? [])
      process.stderr.write(`error: ${error}\n`);
  }
}

async function inspect(options, validate) {
  const input = options._[0];
  if (!input) throw new Error("input path is required");
  const bundle = await loadBundle(input);
  const report = validate
    ? await validateBundle(bundle)
    : await inspectAnimation(bundle);
  printReport(report, options.json);
  if (validate && report.status !== "valid") process.exitCode = 1;
}

async function render(options, { print = true } = {}) {
  const input = options._[0];
  if (!input) throw new Error("input path is required");
  const output = path.resolve(required(options, "out"));
  const bundle = await loadBundle(input);
  const validation = await validateBundle(bundle);
  if (validation.status !== "valid")
    throw new Error(`validation failed: ${validation.errors.join("; ")}`);
  const report = await renderSamples(bundle, validation, output, {
    allFrames: Boolean(options.all_frames),
    allowLarge: Boolean(options.allow_large_render),
  });
  await writeJson(path.join(output, "report.json"), report);
  if (options.mp4 || options.gif)
    await encodeMedia(output, report, options.mp4 ? "mp4" : "gif");
  if (print) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function encodeMedia(output, report, format) {
  if (report.sampled_frames.length !== report.frame_count)
    throw new Error(`--${format} requires --all-frames`);
  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch {
    throw new Error(`ffmpeg is required for --${format} but was not found`);
  }
  const pattern = path.join(output, "frame-%04d.png");
  const target = path.join(output, `preview.${format}`);
  const args = ffmpegArgs(pattern, target, report.fps, format);
  await execFileAsync("ffmpeg", args, { maxBuffer: 10 * 1024 * 1024 });
}

async function verify(options) {
  const input = options._[0];
  if (!input) throw new Error("input path is required");
  const output = path.resolve(required(options, "out"));
  const renderOptions = {
    ...options,
    _: [input],
    all_frames: Boolean(options.full),
    mp4: false,
    gif: false,
  };
  const first = await render(
    { ...renderOptions, out: path.join(output, "first") },
    { print: false },
  );
  const second = await render(
    { ...renderOptions, out: path.join(output, "second") },
    { print: false },
  );
  if (
    JSON.stringify(first.frame_sha256) !== JSON.stringify(second.frame_sha256)
  )
    throw new Error("determinism check failed: frame hashes differ");
  const report = {
    status: "valid",
    deterministic: true,
    sampled_frames: first.sampled_frames,
    frame_sha256: first.frame_sha256,
    poster_sha256: first.poster_sha256,
  };
  await writeJson(path.join(output, "verify-report.json"), report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || command === "help" || options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (command === "init") await init(options);
  else if (command === "clone") await clone(options);
  else if (command === "compare") await compare(options);
  else if (command === "inspect") await inspect(options, false);
  else if (command === "validate") await inspect(options, true);
  else if (command === "render") await render(options);
  else if (command === "verify") await verify(options);
  else if (command === "--help") process.stdout.write(`${usage()}\n`);
  else throw new Error(`unknown command: ${command}\n${usage()}`);
}

main().catch((error) => {
  process.stderr.write(`lottie-maker error: ${error.message}\n`);
  process.exitCode = 1;
});
