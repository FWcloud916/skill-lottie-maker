import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

export function pointerToken(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

export function assertKebab(value, label = "id") {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} must be kebab-case`);
  }
  return value;
}

export async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`could not read JSON ${file}: ${error.message}`);
  }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function safeLocalFile(root, candidate, label) {
  if (
    typeof candidate !== "string" ||
    !candidate ||
    path.isAbsolute(candidate)
  ) {
    throw new Error(`${label} must be a non-empty relative path`);
  }
  const lexical = path.resolve(root, candidate);
  const relative = path.relative(root, lexical);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must resolve to a file inside the bundle`);
  }
  const info = await lstat(lexical);
  if (info.isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
  if (!info.isFile()) throw new Error(`${label} must be a file`);
  const resolvedRoot = await realpath(root);
  const resolved = await realpath(lexical);
  const realRelative = path.relative(resolvedRoot, resolved);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    throw new Error(`${label} escapes the bundle`);
  }
  return resolved;
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { _: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2).replaceAll("-", "_");
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) options[key] = true;
    else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}
