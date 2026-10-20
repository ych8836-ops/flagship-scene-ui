# Source provenance

**Edition scope:** the dependency/download table below describes the root SDK app. The separate [`native/`](native/README.md) edition includes installed source snapshots of Motion Context, noEmbryo, KJNodes, VideoHelperSuite, H3-FaceRefine and optional Spectrum, plus licensed CrossView/Three.js/Noto assets. Their original notices are retained in-place and listed in [native credits](native/CREDITS.md). Protected image-upscaler binaries are absent from Git source; any separately offered full native ZIP identifies that component explicitly. Neither source tree includes model weights or NVIDIA proprietary runtimes.

The detailed [custom-node and workflow credits](CREDITS.md) name maintainers, pinned sources, adopted node IDs, core/optional roles and the original Endless v1.5 workflow by u/embryo10. These acknowledgements supplement the license notices below.

| Component | Origin | Distribution in this source repository |
| --- | --- | --- |
| Studio UI, project/scene orchestration, SDK service, camera adapters | Flagship Scene UI contributors | Original source, AGPL-3.0-only from 0.1.3; see [scope](docs/LICENSING.md) |
| `custom_nodes/ComfyUI-RTX-Video-Restoration` | Existing restoration wrapper source | Source under its retained Apache-2.0 `LICENSE`; proprietary implementations/DLLs excluded |
| Comfy SDK and API Proxy | [Comfy-Org SDK](https://github.com/Comfy-Org/comfy-python-sdk), [Proxy](https://github.com/Comfy-Org/comfy-api-proxy) | Dependencies installed in a separate environment; not vendored |
| MiniMax H3 execution engine | [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | Not bundled; setup copies the user's selected source into the private runtime |
| Motion Context0.6.2 | [NikoDemon80](https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context/tree/5335715abe54c1a9bfbe3494da29aae3e8635ce3) | Upstream nodes/layout/license downloaded separately. Our tiny Endless registration wrapper is included |
| Endless AV stitcher and clip refiner | [noEmbryo](https://github.com/noembryo/ComfyUI-noEmbryo) | External pinned repository, not our algorithm |
| Face tracking/crop/stitch | [Carasibana FaceRefine v1.0.0](https://github.com/Carasibana/ComfyUI-H3-FaceRefine/tree/79a97ce5ee4b393ce26313bd1280b706fe8b4f2c) | External MIT source downloaded separately. A small compatibility patch and our added adapters are included; original MIT notice retained in `integrations/face_refine/UPSTREAM_LICENSE` |
| KJNodes / VideoHelperSuite / Spectrum / YCNodes / controlnet_aux | Official repositories named in `dependencies.lock.json` | Optional/required pinned external installations, never rebranded as Flagship source |
| CrossViewWarp | [cseti007 pinned source](https://github.com/cseti007/ComfyUI-CrossViewWarp/tree/3266a83a84eaa6833a9ebc38ac7cdd8789e44f5b) | Apache-2.0 source and license downloaded separately; our geometry/timing adapter is included |
| Three.js r164 / RoomEnvironment | [Three.js](https://github.com/mrdoob/three.js/tree/r164) | MIT source/license downloaded separately. Installer maps the RoomEnvironment import to the local Three module; original and installed hashes are recorded |
| Noto Sans KR variable font | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosanskr) | OFL font and license downloaded separately |
| jsdom / Acorn | [jsdom](https://github.com/jsdom/jsdom), [Acorn](https://github.com/acornjs/acorn) | Development-only DOM and message-coverage test dependencies, pinned in package-lock.json; not bundled into the studio runtime |
| NVIDIA VFX / Optical Flow / FRUC | [NVIDIA VFX documentation](https://docs.nvidia.com/maxine/vfx-python/latest/index.html), [Optical Flow SDK](https://developer.nvidia.com/opticalflow-sdk) | No proprietary implementation, binding wheel, SDK or DLL included |

The SDK dependency lock records immutable revisions and archive/file checksums. SDK downloads remain in ignored runtime/download directories. The native source snapshots are separately listed and checksummed in native/. References, example model links and dependency availability do not transfer model licenses to this application.

No personal photographs, voice-training material, private voice LoRA or private user project is part of the source package. Competition example footage is a separate text-generated cube example with no real person or branded character.
