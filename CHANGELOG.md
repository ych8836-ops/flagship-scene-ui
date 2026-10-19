# 0.1.3 — AGPL license for original Flagship code

- Changed original Flagship code from MIT to AGPL-3.0-only for this and subsequent releases; included the full official GNU license and project notice.
- Updated package metadata and documented the scope, corresponding-source obligations and previous MIT release history.
- Preserved third-party MIT/Apache-2.0 notices, dependency licenses, historical releases and the original Comfy installation.
- No generation, assembly, camera, upscale or UI behavior changes.

# 0.1.2 — Continuous Endless assembly in normal mode

- Corrected normal-mode assembly to blend the full continuous chain with the upstream Endless AV stitcher, using saved AV archives.
- Kept sequence assembly scene-local: Endless inside each scene, then automatic FFmpeg between completed scenes only.
- Return a single completed Endless range directly, avoiding an unnecessary FFmpeg join/audio re-encode.
- Added normal-chain, single-clip, fresh/continuing scene-boundary, AV timing and missing-archive checks. CPU SDK transport/commit fixtures are explicitly separate from AV assembly validation.

# 0.1.1 — Korean / English interface

- Added a header language switch, browser-language default and persistent local preference.
- Translated studio/camera menus, settings, hover guides, accessibility labels, progress and known application errors using offline message tables.
- Kept prompts, dialogue, names, filenames, canonical option values and generation graphs separate from display text. Language changes retain existing inputs, focus, scroll and video playback position without queuing work.
- Added pinned DOM tests for bilingual behavior, data isolation, hover behavior, message coverage and cleanup; existing UI/SDK tests remain enabled.

# 0.1.0 — SDK public candidate

- Isolated self-hosted official Comfy SDK execution, job recovery/events/cancellation and app-only launcher/stop controls.
- Scene and normal modes, selected-clip regeneration and visible revision history.
- Scene-local Endless AV assembly followed automatically by FFmpeg scene joining.
- Shared references and per-clip tag routing, separate camera editor with hover guides.
- Source-only optional NVIDIA restoration; motion repair defaults to Off.
- Explicit pinned dependency installer, external licenses, model/LoRA links, setup checks and safe examples.

This candidate does not modify the original ComfyUI source. Remaining validation limits are in `docs/VALIDATION.md`.
