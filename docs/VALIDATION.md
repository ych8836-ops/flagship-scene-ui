# Validation record — 2026-10-19

This is a self-hosted SDK release candidate. A registered node or a passing fixture is not proof of generative quality on every scene or GPU.

| Check | Result | What it establishes |
| --- | --- | --- |
| Fresh isolated installation | Passed | New engine copy, separate SDK environment, pinned external source/assets, isolated data and loopback ports |
| Real SDK → official proxy → isolated Comfy CPU video round trip | 16 checks passed | Submission/download, preserved graph, duplicate request recovery, request-key lookup, definitive validation rejection, project commit/gallery, release of active job, FFmpeg-only normal assembly, UI/font/template availability |
| UI DOM and SDK event tests | Passed | Three workspaces, source UI rendering, camera editor/shared controls, scene/revision graph, 99 retained hover guides, cleanup and job-event handling. WebGL is mocked; this is not manual browser certification |
| Bilingual studio DOM checks (0.1.1) | Passed locally | Korean/English chrome, camera panels/hover guides and known errors. Existing controls, focus/selection, scroll, playback time, user names/files, prompts/dialogue and serialized plan/widget state are retained; switching sends no network request. Pinned jsdom tests do not certify WebGL appearance |
| Plan/ledger semantics | Passed | Only tagged common pictures selected, same-scene context retained, scene boundary reset, selected-clip retry leaves other outputs intact |
| Scene-local Endless followed by FFmpeg | Passed | Pinned upstream author/trim nodes with deterministic decoder fixtures and real MP4/FFmpeg. 243 + 238 = 481 frames; scene-head context removed once, synchronized audio placement |
| Dependency/setup checks | Passed | Immutable checksums, missing node reporting, archive path traversal rejected, failed install does not commit a partial directory, source Comfy/private user files not copied or modified |
| New candidate NVIDIA source-worker upscale | Passed, short fixture | 12 frames at 576×768 → 1152×1536, 24 fps. Video and audio both 0.5 s. Observed test elapsed time 8.737 s, including SDK execution; not a performance benchmark |

The upscale test used a separately configured existing NVIDIA binding and FRUC DLL. Neither is distributed with this source. Its first attempt exposed an obsolete opaque-extension guard; the candidate now checks the actual source worker it executes. The second attempt completed and its extracted frame was inspected for gross corruption.

## Earlier GPU evidence, distinct from the new installation checks

Before packaging, matching graphs were compared in an earlier isolated SDK test environment. The tested I2V, R2V and representative camera cases produced matching decoded frames and audio between native and SDK execution. Upscale outputs had small run-to-run differences. The demo's two-clip, 243-frame red cube is a real output from that earlier SDK environment, not a newly generated full-feature benchmark.

No new H3 model inference was forced alongside the user's original engine during this packaging pass: the original held GPU memory. Original source is checked separately against the recorded source hashes. Its processes, model residency and queue were not changed.

## Limits still requiring use-case review

- Manual browser interaction, mobile layout and listening are separate from the automated DOM/signal checks.
- Not every retained camera preset has been rerendered in the newly installed candidate. Large orbit/rotation, occlusion and face identity remain conditional model behavior. Four previously unreliable full-rotation/arc presets stay removed.
- This does not establish low-VRAM, long-video or non-Windows compatibility. The fresh upscale fixture is only half a second long.
- Motion repair is Off by default. Its proprietary-runtime availability is distinct from Python node registration.
- Character-specific voice-LoRA routing was abandoned and is not advertised as implemented. Multiple speakers may still affect voice identity and lipsync.
- SDK transport does not reduce diffusion steps or promise better generated quality. No fabricated speedup or quality percentage is claimed.

## Reproduce

Follow [installation](INSTALLATION.md), install the explicit UI dependency profile, then run:

```powershell
python tests/test_setup.py
python tests/test_dependencies.py
python tests/test_plan_semantics.py
npm ci
npm test
Start.cmd --cpu
# In a second terminal, while the isolated CPU engine is running:
.sdk-venv\Scripts\python.exe tests/smoke_sdk.py
```

Run `tests/test_scene_assembly.py` with the selected Comfy Python after the core profile is installed; it uses real encoding and fixture decoders, not H3 inference. Stop the isolated CPU services before starting GPU mode. Logs and machine-specific evidence stay under ignored `runtime`, outside the source ZIP.
