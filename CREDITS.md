# Credits and upstream custom nodes

Flagship Scene UI builds a studio interface and project/scene/clip orchestration around existing ComfyUI and MiniMax H3 capabilities. Credit for the generation model, motion/audio context, Endless AV stitching, upstream refinement, optimizer patches and geometry implementations belongs to the respective upstream projects and contributors below.

## Workflow foundation

The early workflow setup was based on **Endless MiniMax H3 (with Endless LipSync) v1.5**, published by **u/embryo10**, before the studio interface was developed. See the [original workflow announcement](https://www.reddit.com/r/comfyui/comments/1wt5oe9/endless_minimax_h3_with_endless_lipsync_v15_less/) and its linked [workflow page](https://civitai.red/models/2909076/endless-minimax-h3-with-endless-lipsync). The announcement points to noEmbryo's stitcher and NikoDemon80's Motion Context implementation; those are credited separately below. We do not claim the upstream Endless workflow or its underlying algorithms as original Flagship inventions.

## Adopted external custom-node projects

Repository links point to the revisions pinned by this release. "Core profile" describes our installer grouping; a feature-specific node still runs only when the corresponding graph branch is selected.

| Use in this app | Project and source | Upstream maintainer / contributors | Contribution used |
| --- | --- | --- | --- |
| Core chain | [ComfyUI-H3-Motion-Context](https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context/tree/5335715abe54c1a9bfbe3494da29aae3e8635ce3) | NikoDemon80 and contributors | Motion/audio continuation and AV latent Save/Load/Trim. Our `EndlessV15...` names are registration aliases over this upstream implementation, not a new context algorithm. |
| Core assembly; optional clip refiner | [ComfyUI-noEmbryo](https://github.com/noembryo/ComfyUI-noEmbryo/tree/4289beac758c836138d3eab560cefaa5dc0f6057) | noembryo and contributors | `H3MotionContextClipStitcher -noEmbryo` performs Endless AV overlap stitching; `H3ClipRefiner -noEmbryo` supplies the optional clip refiner. Flagship orchestrates these nodes. |
| Core profile; selected optimizer branches | [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes/tree/3f20054214fec9f9234fd3841ae6f1e4287948f6) | kijai and contributors | `MiniMaxH3MemoryEfficientSageAttentionPatch`, `PathchSageAttentionKJ`, `MiniMaxChunkFeedForward` and `ModelPatchTorchSettings` for selected attention/memory settings. |
| Core profile; video reference input | [ComfyUI-VideoHelperSuite](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite/tree/4d907bee61e92c2e65af3bd6383a4e4d356126d1) | Kosinkadink and contributors | `VHS_LoadVideoFFmpeg` loads reference video used by the camera/reference branches. |
| Optional camera / face repair | [ComfyUI-H3-FaceRefine](https://github.com/Carasibana/ComfyUI-H3-FaceRefine/tree/79a97ce5ee4b393ce26313bd1280b706fe8b4f2c) | Carasibana and contributors | Upstream `H3FaceTrackCrop`, `H3InjectVideoLatent` and `H3FaceStitch`. Our compatibility patch, no-face guard and color adapter are documented separately; upstream tracking/refinement is not claimed as Flagship work. |
| Optional camera geometry | [ComfyUI-CrossViewWarp](https://github.com/cseti007/ComfyUI-CrossViewWarp/tree/3266a83a84eaa6833a9ebc38ac7cdd8789e44f5b) | cseti007 and contributors | Pinned geometry warp implementation, imported by our `FlagshipCrossViewGuide` adapter; installed as a source dependency rather than a separately exposed node pack. |
| Optional Spectrum optimizer | [ComfyUI-Spectrum-MiniMax-H3](https://github.com/xmarre/ComfyUI-Spectrum-MiniMax-H3/tree/9dc51b7fbb6e1c5208701ed3c8494801b4754097) | xmarre and contributors | `SpectrumApplyMiniMaxH3` for optional feature forecasting. Not required for ordinary generation; availability does not imply every camera/lipsync branch supports it. |
| Optional restoration helper | [comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux/tree/a587a4c1594524c1d2de5cd1a86cd868ff448e1c) | Fannovel16 and contributors | DWPose helper code/assets used by the optional human-structure restoration guard. This is a helper dependency; the default generation graph does not require a `DWPreprocessor` node. |
| Optional extra-workflow compatibility | [ComfyUI-YCNodes-MiniMax-H3](https://github.com/yichengup/ComfyUI-YCNodes-MiniMax-H3/tree/efbe83f69ffa97a251a575ce42edc7bf8005da0c) | yichengup and contributors | Available through the `extra` installer profile for compatible additional workflows. Not called by the shipped standard studio graph; not a mandatory default dependency. |

## ComfyUI built-in nodes and execution

[ComfyUI — Comfy-Org and contributors](https://github.com/Comfy-Org/ComfyUI) supplies the native MiniMax H3 conditioning/sampling, VAE/audio handling, model/LoRA loading, masking, video saving, EasyCache and native attention selection. `LoadMoGeModel` / `MoGeInference` are ComfyUI built-in nodes in the checked engine, not KJNodes or a new Flagship geometry engine. MiniMax's H3 model is credited separately in [model and LoRA sources](docs/MODELS.md).

Execution uses the separately installed [official Comfy Python SDK](https://github.com/Comfy-Org/comfy-python-sdk) and [Comfy API Proxy](https://github.com/Comfy-Org/comfy-api-proxy). These upstream implementations are not authored by Flagship.

The original Endless workflow also references rgthree and Easy-Use. They are part of that workflow's own dependency list; they are not required by the shipped Flagship studio graph, so this document does not present them as installed studio dependencies.

## Flagship source and adaptations

Our published packs provide the studio UI, project/scene records, graph construction, selected regeneration, output gallery, camera orchestration/adapters and optional restoration wrapper. See [the exact included-node inventory](docs/CUSTOM_NODES.md). The four `EndlessV15...` IDs remain aliases of upstream Motion Context code. The FaceRefine integration preserves [Carasibana's MIT notice](integrations/face_refine/UPSTREAM_LICENSE) alongside our patch/additions.

The `RTXVideoVSRRestore` wrapper retains its adjacent Apache-2.0 license. NVIDIA VFX / NVOFA / FRUC are NVIDIA technologies; proprietary bindings, SDKs and DLLs are not distributed here. Their sources/terms are linked in [third-party notices](THIRD_PARTY_NOTICES.md). Three.js, Noto Sans KR and development libraries also retain their upstream credits there.

## Versions and licenses

`dependencies.lock.json` records installed upstream revisions and checksums. This document acknowledges reuse and is not a replacement for upstream licenses or proof that every optional branch has been tested. External source, models and runtimes are installed separately. Original Flagship code is AGPL-3.0-only from 0.1.3; third-party licenses remain intact. See [license scope](docs/LICENSING.md) and [installation profiles](docs/INSTALLATION.md).

## 한국어 출처 안내

초기 워크플로우의 기반은 u/embryo10이 공개한 **Endless MiniMax H3 v1.5**입니다. 연속 생성·오디오 컨텍스트는 **NikoDemon80의 Motion Context**, AV 합치기·클립 리파이너는 **noembryo**의 구현을 사용합니다. **kijai, Kosinkadink, Carasibana, cseti007, xmarre, Fannovel16, yichengup**과 각 프로젝트 기여자의 작업도 위 표의 기능에 사용하거나 선택 설치 대상으로 채용했습니다.

Flagship에서 별도로 구현한 스튜디오 UI·프로젝트 관리·씬 관리·갤러리·실행 연결과 외부 생성 기술의 기여를 구분합니다. 선택 설치만 가능한 노드를 기본 그래프에서 항상 사용하는 것처럼 설명하지 않습니다. 데모·게시글에서도 이 문서 링크와 주요 기반 프로젝트의 이름을 유지해 주세요.

For demos or project descriptions: Flagship Scene UI adds a studio interface and scene/clip orchestration to ComfyUI/MiniMax H3, building on the Endless v1.5 workflow, NikoDemon80's Motion Context and noEmbryo's stitcher/refiner, with the additional upstream projects credited above.
