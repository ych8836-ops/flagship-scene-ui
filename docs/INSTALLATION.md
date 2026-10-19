# Installation and feature prerequisites

## Isolation first

Use a separate folder for this repository. `setup.py` asks which ComfyUI folder to read; it does not assume an E: drive or install into the source folder. It creates its own engine copy, external nodes, inputs/outputs, project records, DB and SDK environment. Do not upload `runtime`, `config.local.json` or `.sdk-venv` to a public repository.

The source Comfy Python must already run ComfyUI/H3 successfully. Its packages are reused, not modified by setup. If an optional Python prerequisite is absent, install it into the environment of a separate test Comfy installation you choose, or leave that feature disabled. Do not blindly replace torch, numpy or ONNX runtime packages in a working production environment.

## Dependency profiles

```powershell
python tools/install_dependencies.py --features core ui camera
# Optional extra node packs:
python tools/install_dependencies.py --features spectrum repair extra
```

These commands explicitly download external source/assets into this app and verify `dependencies.lock.json` checksums. They do not download model weights or install Python requirements into the source environment. Dependency directories without our installation marker are not overwritten. An optional `--cache` supplies matching archives locally, still checksum-checked.

| Profile | External components | Engine Python requirements |
| --- | --- | --- |
| core | [KJNodes](https://github.com/kijai/ComfyUI-KJNodes), [noEmbryo](https://github.com/noembryo/ComfyUI-noEmbryo), [VideoHelperSuite](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite), pinned [Motion Context](https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context) | Working ComfyUI/H3, PyAV, imageio-ffmpeg; each external pack's own requirements |
| ui | Three.js r164, Noto Sans KR | None; assets are served locally after explicit installation |
| camera | [FaceRefine](https://github.com/Carasibana/ComfyUI-H3-FaceRefine) v1.0.0 plus our small compatibility patch/adapters; pinned [CrossViewWarp](https://github.com/cseti007/ComfyUI-CrossViewWarp) | numpy, torch, opencv-python, scipy, ultralytics; InsightFace only where identity matching is used; local ctranslate2/tokenizers/openai-whisper for guarded speech repair |
| spectrum | [Spectrum](https://github.com/xmarre/ComfyUI-Spectrum-MiniMax-H3) | Pack's own requirements; remains optional/off by default |
| repair | [controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux) | Pack's requirements and local detector/pose weights for the optional restoration guards |
| extra | [YCNodes](https://github.com/yichengup/ComfyUI-YCNodes-MiniMax-H3) | Pack's own requirements, for compatible additional workflows |

The Endless adapter registers distinct `EndlessV15...` IDs over the pinned four Motion Context nodes. Installing an arbitrary newer context pack alone does not create those IDs. Do not update the external code under the alias without re-running compatibility checks.

The camera graph template JSON is part of our source, while the external implementations it calls remain separate dependencies. Node registration alone is insufficient: [models/LoRAs/runtimes](MODELS.md) must also be installed for the selected controls.

## Local checks

```powershell
Start.cmd --cpu
# In another terminal:
.sdk-venv\Scripts\python.exe tests/smoke_sdk.py
python tools/check_installation.py --url http://127.0.0.1:18881 --features generation scene_assembly camera --sdk-url http://127.0.0.1:18883
```

CPU mode checks the SDK transport and synthetic video/FFmpeg operations. It rejects H3 generation. Stop it and restart with `Start.cmd` for GPU inference. Do not interpret the CPU fixture as a generative-quality or speed benchmark.

## Common issues

- **Missing `EndlessV15...`:** run the core dependency profile and use our alias wrapper, then restart only this app.
- **Camera template missing:** ensure `custom_nodes/ComfyUI-H3-R2V-CameraLipLock/workflows/H3_R2V_Camera_SourceEdit_8Step_API.json` is present.
- **Model/LoRA not found:** pick the installed filename in the UI after refresh; consult the exact folder/link table. A private voice LoRA is not required.
- **No NVIDIA upscaling runtime:** configure the app-local NVIDIA binding/DLL paths. The node may be registered even when the proprietary runtime is absent.
- **Unknown SDK submission outcome:** inspect the stored request/job ID before retrying. Do not repeatedly press Generate to resolve an unknown submission.
- **Port in use:** choose three unused loopback ports via `setup.py --ports ...`; never stop a different application's process to reuse its port.
- **Large scene memory pressure:** shorten scene size or use suitable generation/upscale memory settings. Scene-by-scene assembly avoids holding the entire project's decoded frames, but a single scene can still be large.

## 한국어 빠른 안내

1. 이 소스를 별도 폴더에 압축 해제합니다. 기존 Comfy 폴더에 덮어쓰지 않습니다.
2. `setup.py`에 사용할 ComfyUI 폴더와 Python 경로를 지정합니다. 경로를 생략하면 어느 폴더인지 묻습니다. 원본은 읽기만 하고 앱 폴더에 실행용 사본을 만듭니다.
3. 필수 외부 노드·모델·LoRA는 위 표와 [다운로드 목록](MODELS.md)을 따라 설치합니다. SDK 환경은 별도로 생성합니다.
4. `Start.cmd` 실행 후 `http://127.0.0.1:18881`에서 예제 워크플로우를 불러옵니다. 새 프로젝트에서 실제 모델/LoRA를 선택합니다.
5. 씬 안 클립은 Endless로 합치고, 씬 처리가 모두 끝나면 자동으로 FFmpeg로 최종 합본을 만듭니다. 일반 모드는 전체 연속 클립을 기존 Endless AV 방식으로 합칩니다. 일반 모드와 단일 씬은 추가 FFmpeg 연결 없이 완성된 Endless 결과를 저장합니다. 두 모드 모두 원본 AV 연결 파일을 보관해야 합니다.
6. 종료는 `Stop.cmd`입니다. 원본 Comfy를 재시작하거나 중단하지 않습니다.
