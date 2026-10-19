# Models, LoRAs and runtime downloads

Weights are not bundled or downloaded during generation. Install compatible files yourself, then select their actual names in the UI. A variant with different quantization/pruning is a different model choice; do not silently rename it to match these defaults.

## Base H3 setup

The following files were verified to exist in the [official Comfy H3 repository](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main). Folder names below are relative to the model directory selected during setup.

| File | Folder | Download |
| --- | --- | --- |
| `minimax_h3_fl2va_pruned_int8_convrot.safetensors` | `diffusion_models/` | [Official file](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors) |
| `qwen3vl_32b_minimax_h3_int8_convrot.safetensors` | `text_encoders/` | [Official file](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors) |
| `minimax_h3_video_vae_fp16.safetensors` | `vae/` | [Official file](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_fp16.safetensors) |
| `minimax_h3_audio_vae_fp32.safetensors` | `vae/` | [Official file](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors) |
| `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` | `loras/minimax/` | [Official eight-step Turbo LoRA](https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors) |

Turbo is required for the shipped eight-step recipe, not for every possible H3 workflow. Changing the model/LoRA may require a different schedule. The default Turbo strength is 0.9 because that was the tested setup; it is not a universal quality recommendation.

## R2V with the shipped FL2VA recipe

The default reference-adaptation file is **community-extracted**, not an official Comfy checkpoint:

| File | Folder | Source |
| --- | --- | --- |
| `minimax_h3_ref_lora_layer20-49adaln_proj_rank_256_bf16.safetensors` | `loras/minimax/` | [morisoba model page](https://huggingface.co/morisoba/ComfyUI_extracted_lora/tree/main/minimax-h3) · [file at pinned revision](https://huggingface.co/morisoba/ComfyUI_extracted_lora/resolve/d1a11cbe090ed0ed4a65a712e95b1612632685c6/minimax-h3/minimax_h3_ref_lora_layer20-49adaln_proj_rank_256_bf16.safetensors) |

It is used only by graph branches that request it. It is not a voice LoRA and can influence reference conditioning. A compatible native Ref2VA setup may instead omit this adapter; the studio does not automatically swap your base model to make that choice.

## Optional camera capabilities

Only install assets needed by the selected controls. Camera preset names are not a guarantee of exact physical camera motion.

| Capability | Asset / location | Publisher |
| --- | --- | --- |
| Geometry | Compatible MoGe weight in `geometry_estimation/` | [Comfy-Org MoGe](https://huggingface.co/Comfy-Org/MoGe) |
| Generative camera guide | Compatible H3 Fun ControlNet in `model_patches/` (legacy `controlnet/` is also registered by setup) | [Official H3 ControlNet tutorial](https://docs.comfy.org/tutorials/video/minimax/minimax-h3-fun-controlnet) |
| Cross-view guide | `MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors` in `loras/` | [Cseti](https://huggingface.co/Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1) |
| Retained motion adapter controls | `camera_motion_h3_lora_v1_3000_pruned.safetensors` in `loras/` | [Jojocodex](https://huggingface.co/Jojocodex/minimax-h3-Camera-Motion-lora) |
| Face detector | `face_yolov8m.pt` in `ultralytics/bbox/` | [Bingsu/adetailer](https://huggingface.co/Bingsu/adetailer) |
| Body framing / segmentation | `yolo11n-pose.pt`, `yolo11n-seg.pt` in `flagship_segmenters/` | [Ultralytics official assets](https://github.com/ultralytics/assets/releases/tag/v8.3.0) |
| Conservative source-speech conditioning | Repository files under `whisper/faster-whisper-small/` | [Systran faster-whisper-small](https://huggingface.co/Systran/faster-whisper-small) |

No 360-orbit LoRA is required: the unreliable full-rotation presets were removed. Missing optional models should be installed or the corresponding control left unused, not substituted with unrelated weights. Local Whisper absence skips the guarded repair branch; it does not download a model in the background or replace the original audio.

## Optional NVIDIA restoration

This wrapper uses the NVIDIA VFX Python binding with the `nvvfx.VideoSuperRes` API. The tested Windows wheel is `nvidia-vfx 0.1.0.1` (SDK1.2 series), Python3.12 ABI3, also used with the tested Python3.13 engine.

- [NVIDIA VFX Python documentation](https://docs.nvidia.com/maxine/vfx-python/latest/index.html)
- [NVIDIA-hosted tested Windows wheel](https://pypi.nvidia.com/nvidia-vfx/nvidia_vfx-0.1.0.1-cp312-abi3-win_amd64.whl)
- [NVIDIA Optical Flow / FRUC downloads](https://developer.nvidia.com/opticalflow/download)

Install the NVIDIA wheel into a separate **app-local** folder, not your source Comfy Python environment:

```powershell
& "D:\ComfyUI_portable\python_embeded\python.exe" -m pip install --no-deps --target "runtime/nvidia_vfx" "https://pypi.nvidia.com/nvidia-vfx/nvidia_vfx-0.1.0.1-cp312-abi3-win_amd64.whl"
```

Then set `"nvidia_vfx_python": "runtime/nvidia_vfx"` in `config.local.json`. For FRUC repair, obtain the compatible SDK's `NvOFFRUC.dll` yourself and set `nvoffruc_dll` to its path. The installed NVIDIA driver must support the selected runtime. The application does not redistribute those files or silently accept their download terms.

Motion repair defaults to Off. Upscaling without motion repair still needs the VFX runtime; FRUC repair additionally needs its DLL and compatible hardware. Frame rate remains the delivered timeline's frame rate: selective midpoint repair is not a claim of arbitrary frame-rate conversion or generative recovery of missing identity detail.
