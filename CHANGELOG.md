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
