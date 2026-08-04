# Project overview

> **Last updated:** 2026-08-04

## 1. Purpose and scope

`lottie-maker` is a portable Agent Skill and deterministic local toolchain for Lottie JSON. It
supports create, revise, diagnose, validate, render, and verify workflows across reusable profiles
or a bounded custom canvas. Publishing, network asset acquisition, paid APIs, and After Effects
project editing are outside scope.

## 2. Users and primary journeys

An agent can create a bundle from a motion brief, clone a sole original byte-for-byte before a
revision, audit changed JSON paths, inspect a third-party JSON without writing, validate portability,
render sampled or complete frames, and verify identical output hashes. A human reviews poster and
contact sheet before accepting output.

## 3. System context

The Agent Skill supplies workflow policy. The Node CLI supplies deterministic mechanics. AJV checks
the official schema as an advisory signal; custom checks enforce the smaller portable profile.
CanvasKit/Skottie renders local assets. Optional local `ffmpeg` converts a complete PNG sequence.

## 4. Repository structure

```text
.codex-plugin/             Codex plugin manifest
.claude-plugin/            Claude plugin and marketplace manifests
docs/                      Canonical project documentation
evals/                     Skill trigger expectations
progress/                  progress-tracker state
scripts/verify.sh          Complete verification gate
skills/lottie-maker/       Canonical Agent Skill and runtime
```

## 5. Runtime architecture

`lottie-maker.mjs` parses commands and owns output behavior. `profiles.mjs` resolves bounded canvas
and timeline values. `lottie.mjs` creates, loads, inspects, and validates bundles;
`composition.mjs` validates checkpoint hierarchy, bounds, reading order, text fit, card geometry,
and declared geometry-claim structure. `emit.mjs` supplies the shared Lottie JSON construction
primitives `createAnimation` and every example builder are built from. `text-metrics.mjs` supplies
the text-width heuristic shared by the generator and the composition validator. `render.mjs` loads
CanvasKit, records Skottie diagnostics, renders PNGs, and computes hashes. `geometry.mjs` renders
each geometry claim's named layers in isolation, measures contact from the resulting pixel masks,
and detects degenerate (aliased or static) sampling. `io.mjs` centralizes safe path and JSON
utilities.

## 6. Data flow

Creation resolves `brief.yaml` into a starter `animation.json` and local font. Inspection reads JSON
and assets but does not write. Validation combines inspection with brief-to-animation invariants.
Composition validation samples declared stable frames before rendering is allowed. Verification
renders twice into separate directories and compares ordered frame hashes.

## 7. Portability and security boundaries

The portable profile permits precompositions, images, shapes, and text while rejecting unsupported
layer types, expressions, embedded or remote URLs, effects/3D flags, missing assets, symlinks, and
paths outside the bundle. Canvas, FPS, duration, asset counts, byte sizes, and full-render estimates
are bounded.

## 8. Quality strategy

Unit tests cover profiles and limits. CLI tests cover dry-run, overwrite protection, read-only
inspection, validation, and unsafe assets. Render tests cover multilingual shaping, animation state,
poster/contact-sheet creation, and deterministic hashes. Geometry tests cover synthetic mask math,
an empirical reproduction of a real historical tangent-only defect, and CLI wiring (dry-run,
skipped-when-undeclared, matte refusal, `--frames` override, determinism). Every example builder is
checked for drift against its committed output on every gate run. ESLint, Prettier, plugin
validation, skill validation, eval validation, and a smoke render form the release gate. The
production experience behind these gates is recorded in
[lottie-production-guide.md](lottie-production-guide.md).

## 9. Distribution and compatibility

The repository can be installed as a Codex plugin, a Claude Code marketplace plugin, or a standalone
Agent Skill through Skills CLI. Node 22+ is the supported runtime. CanvasKit is pinned for stable
rendering; `ffmpeg` is optional and never changes canonical JSON.

## 10. Change and release process

One progress-tracker item may be in progress. Changes update code, tests, docs, manifests, and
third-party notices together. `bash scripts/verify.sh` must pass and changed visuals must be inspected
before versioning. Versions remain synchronized across package and plugin manifests.
