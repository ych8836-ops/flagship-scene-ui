# Included source and node inventory

This repository contains four project source packs, one registration adapter and two face-refiner integration nodes. It does not claim authorship of the H3 model, ComfyUI, the external Motion Context/Endless algorithm, CrossViewWarp, MoGe, FaceRefine tracking or NVIDIA implementations. Their origins and installation links are in [third-party notices](../THIRD_PARTY_NOTICES.md), [the dependency lock](../dependencies.lock.json) and [model links](MODELS.md).

| Source pack | Function | Registered nodes |
| --- | --- | --- |
| `ComfyUI-Endless-H3-AllInOne` | Flagship Scene UI, project/clip ledger, selected regeneration, background reference, scene assembly, saved outputs | 7 |
| `ComfyUI-Flagship-Camera-Guide` | Geometry/depth guidance, framing, numeric multi-angle/zoom, camera motion eligibility, foreground/prop/lip-repair guards | 21 |
| `ComfyUI-H3-R2V-CameraLipLock` | Source-reference camera direction, timeline, source edits/reframing, audio alignment/retention and segment previews | 10 |
| `ComfyUI-RTX-Video-Restoration` | NVIDIA video restoration/upscale wrapper, inline temporal helpers and memory profiles | 1 public extension node |

The UI and SDK service are also included. Node names describe their role, not a guarantee that every generative shot or lipsync attempt will succeed.

## Studio

`EndlessH3AllInOne`, `EndlessH3BackgroundFrame`, `EndlessH3ConcatClips`, `EndlessH3ConcatScenes`, `EndlessH3OutputVideo`, `EndlessH3ProjectCommit`, `EndlessH3StitchScene`.

The scene stitch node orchestrates the separately installed upstream Endless stitcher. It does not rebrand that algorithm as a new Flagship algorithm.

## Camera guide

`FlagshipCameraDollyLayers`, `FlagshipCameraLayeredDolly`, `FlagshipCameraLipRepairGuard`, `FlagshipCameraLipRepairSwitch`, `FlagshipCameraMotionEligibility`, `FlagshipCameraMotionViews`, `FlagshipCameraOrbitEligibility`, `FlagshipCameraProtectProps`, `FlagshipCameraSourceFraming`, `FlagshipCameraSourceWarp`, `FlagshipCameraTargetFraming`, `FlagshipCameraVisibleTargets`, `FlagshipCameraWideComposite`, `FlagshipCrossViewGuide`, `FlagshipDepthRackFocus`, `FlagshipGeometryCamera`, `FlagshipMultiAngle`, `FlagshipMultiAngleGuide`, `FlagshipMultiAngleSourceZoom`, `FlagshipPrepareCameraGeometry`, `FlagshipSaveGeometry`.

Geometry and generative controls require the corresponding separately installed models/node packs. Retained source code for eligibility checks does not make the removed unreliable 360/arc UI presets available.

## R2V camera and audio

`H3CameraAudioJoin`, `H3CameraExactAudioLock`, `H3CameraModelOptions`, `H3CameraReferenceBalance`, `H3CameraReferenceEdit`, `H3CameraReframe`, `H3CameraSegmentPreview`, `H3CameraTrimClip`, `H3R2VCameraLipLock`, `H3R2VCameraTimeline`.

Audio waveform retention and generated mouth motion are different things. This is not character-specific voice-LoRA routing.

## Video restoration

`RTXVideoVSRRestore`. Its Python worker, NVOFA/FRUC adapters and guards are included under the adjacent Apache-2.0 license. NVIDIA VFX, Optical Flow implementations, binding wheel and DLLs are not included. The inline `NVOFATemporalArtifactRepair` helper is source used by the restoration path; it is not a separately registered public extension node here.

The standalone image upscaler, image/video downscalers and the retired separate NVOFA bridge are excluded.

## Context registration adapter

`ComfyUI-Endless-H3-v15-Context` contains only our registration wrapper. It exposes these four IDs over separately downloaded, pinned Motion Context source:

`EndlessV15MiniMaxH3MotionContext`, `EndlessV15MiniMaxH3MotionContextTrim`, `EndlessV15MiniMaxH3MotionContextSaveLatent`, `EndlessV15MiniMaxH3MotionContextLoadLatent`.

These are adapters to an external implementation, not four independently authored context engines.

## Face-refiner integration

`integrations/face_refine` contains `H3FacePresence`, `ColorMatchLABChunked`, a small attributed compatibility patch and the upstream license. The installer applies them to the external FaceRefine pack. The upstream detector, tracker, crop and stitch implementation is not copied into this repository.

## Not distributed

Model/LoRA weights, NVIDIA SDK/DLLs, external node source, Python environments, private projects, user media, generated demonstration videos and unpublished submission drafts are excluded. The original ComfyUI installation is not modified by publishing this repository.
