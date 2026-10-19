# Flagship Scene UI

**Direct scenes. Refine individual clips. Keep the workflow open.**

A scene-based MiniMax H3 studio powered by the **official Comfy SDK**. Plan a story, assign references to the right clips, direct camera changes, regenerate one clip, and assemble the result without rebuilding the entire project.

The interface keeps three separate workspaces: settings and clip plans, preview and the output gallery, and a visual scene/clip revision graph. Camera direction has its own editor. Brown surfaces, grey controls and mint active states distinguish the studio.

**Language:** use **한국어 / English** in the studio header to switch the interface immediately. The first visit follows the browser language (Korean, otherwise English); your manual choice is saved locally. Menus, settings, camera controls/hover guides, status and known application errors have offline translations. Prompts, dialogue, project/scene names, filenames and serialized generation settings stay unchanged. This switch is independent of ComfyUI's language setting. [Language details](docs/LANGUAGE.md).

## What it does

- **Scenes above clips:** reset continuity at a scene boundary; retain motion context within a scene. Normal mode remains available.
- **Selected-clip regeneration:** choose an existing clip and preserve the other stored outputs and revision history.
- **Reference routing:** common image/video/audio inputs, with `<Picture N>` or `@picture_N` selecting the required pictures per clip. I2V supports opening and optional closing images.
- **Camera direction:** shot, angle, motion, lens, focus, numeric angle paths, and animated guides. Existing unreliable large-rotation presets were removed. Generative camera results are conditional, not calibrated physical camera guarantees.
- **Dialogue-aware workflows:** shared lipsync audio, source-audio preservation and conservative face-repair eligibility checks. This is not a character-specific voice-LoRA router.
- **Assembly:** within each scene, the upstream Endless AV stitcher blends the context overlap. Completed scenes are saved one at a time and automatically joined by FFmpeg. The final scene-to-scene video join uses stream copy, without VAE. Normal mode retains FFmpeg clip concatenation.
- **Optional NVIDIA upscaling:** gallery-selected exports, memory profiles, auto colour and output quality. Motion repair defaults to **Off**. NVIDIA runtimes are installed separately.
- **Official SDK execution:** generation, retry, assembly, upscaling and camera jobs pass through the SDK service and official API proxy. Progress, previews and cancellation are scoped to the SDK job. An uncertain submission is not silently submitted again or redirected to a native queue.

## Run locally

The tested setup is **Windows 11, ComfyUI 0.38.1 with H3 support, Python 3.13 for the engine, Python 3.12 for the SDK service, RTX 5090**. Different GPUs and long projects need their own memory/quality checks. NVIDIA restoration is Windows/NVIDIA specific. The base studio is not advertised as verified on every platform.

You need an existing working ComfyUI installation and its Python environment. Setup uses that folder as a **read-only source** and copies the engine into this app's private `runtime`. It does not install these nodes into or restart your existing ComfyUI. Models can be shared by path; inputs, outputs, project history and databases stay separate.

1. Download/clone this repository into a separate folder. Install [Git](https://git-scm.com/downloads) and a standard Python 3.10+ for creating the small SDK environment.
2. Run the following, replacing both source paths. If `--comfy` is omitted, setup asks which ComfyUI folder to use.

```powershell
py -3.12 setup.py --comfy "D:\ComfyUI" --comfy-python "D:\ComfyUI_portable\python_embeded\python.exe" --create-sdk-env --install-dependencies
```

For a standard virtualenv installation, give its `python.exe` instead. Setup never runs pip against that engine Python. The separate SDK environment gets `comfy-sdk==0.5.0` and `comfy-api-proxy==0.1.6`.

3. Install the required [models and LoRAs](docs/MODELS.md) in your selected model directory, and make sure the engine Python has the [feature-specific prerequisites](docs/INSTALLATION.md). Choose the actual installed filenames in the UI.
4. Run **`Start.cmd`**, open **http://127.0.0.1:18881**, and load **[examples/Flagship_Scene_UI.json](examples/Flagship_Scene_UI.json)**. Upload your references and create a new project. `Stop.cmd` stops only this app's services. On other platforms use `python run.py` / Ctrl+C after configuration; those platforms remain unverified.

The default ports are 18881 (Comfy), 18882 (official proxy) and 18883 (SDK service). They bind to loopback. This release is a self-hosted SDK app, not a claim that the same custom-node workflows are already deployed on Comfy Cloud.

[한국어 설치·변경 안내](docs/RELEASE_KO.md)

## First project

Use [the safe cube example](examples/cube_sequence_plan.json) to learn the plan format. Select compatible model/LoRA files before generating. It uses no people, reference photos or private voice LoRA.

1. Add scenes and their clips, or import the plan JSON.
2. Use clip generation, all clips, or all clips plus assembly. The shared Generate control executes the selected action.
3. Select an existing clip to regenerate only that clip. The revision graph and gallery preserve earlier results.
4. Merge to run scene-local Endless stitching followed automatically by FFmpeg scene concatenation. Optional upscaling follows the existing final-output settings.

Settings that define an existing run's geometry are protected. Make a new project for a new resolution. Keep generated AV archives if you need scene-local Endless reassembly; MP4s alone are sufficient only for the normal FFmpeg-only path.

## Verification and limits

The independently installed public candidate passes actual SDK/proxy/Comfy CPU video submission, download, duplicate-key recovery, validation failures, project commit, gallery registration and FFmpeg assembly. UI DOM/event tests cover the three panels, camera editor and retained 99 hover guides. Scene overlap/AV timing is tested with deterministic decoder fixtures and real encoding/FFmpeg.

Earlier isolated GPU comparisons produced identical decoded frames and audio for matching I2V, R2V and representative camera graphs; upscaling had small run-to-run differences. Those measurements describe those cases, not every preset or this release on every machine. [Validation details](docs/VALIDATION.md) distinguish these checks from manual browser, listening, long-video and low-VRAM review.

SDK transport is **not** a new sampling-speed or image-quality algorithm. Large rotations, occlusion, many visible speakers and camera-induced identity changes remain model limitations. Registration of an upscaler node does not prove that its proprietary NVIDIA runtime is installed.

## Development

```powershell
python tests/test_plan_semantics.py
python tests/test_dependencies.py
python tools/install_dependencies.py --features ui
npm ci
npm test
# With the isolated server started using Start.cmd --cpu:
.sdk-venv\Scripts\python.exe tests/smoke_sdk.py
```

The DOM tests intentionally mock WebGL and exercise its accessible fallback; they are not a manual browser visual certification. No test should submit a job to another ComfyUI installation.

## Source and dependencies

This repository publishes the Flagship UI, orchestration, adapters and our custom-node source. **No ComfyUI engine, external node implementation, Python environment, NVIDIA SDK/DLL, model, LoRA, private project or user media is bundled.** The installer downloads pinned external code/assets only when requested and verifies SHA256. External repositories remain separately attributed. [Installation](docs/INSTALLATION.md), [architecture](docs/ARCHITECTURE.md), [prompt rules](docs/PROMPT_RULES_KO.md), [credits and licensing](THIRD_PARTY_NOTICES.md).

See the [included custom-node inventory](docs/CUSTOM_NODES.md) for the four source packs, the external-context registration adapter and the face-refiner integration patches. The standalone image upscaler and downscalers are not part of this repository.

An unused historical NVOFA bridge requiring a separate retired helper is excluded. The studio's restoration path uses `RTXVideoVSRRestore` and its included inline temporal helpers.

Own project code is MIT; existing Apache-2.0 restoration source retains its adjacent license. The face-refiner integration is an attributed patch to an external MIT project, not a claim of authorship of the upstream face tracker. Model/runtime terms remain with their publishers.

Prepared for [Open Source Higgsfield](https://comfy.org/open-source-higgsfield/) using the [Comfy Developer Platform](https://docs.comfy.org/development/api-development/sdks). Local readiness is separate from publishing or competition submission.
