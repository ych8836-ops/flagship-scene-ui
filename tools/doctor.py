"""Read-only configuration/prerequisite report; never install or submit jobs."""
import argparse
import importlib.util
import json
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
def fetch(url):
    with urllib.request.urlopen(url,timeout=10) as response:return json.load(response)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path);args=parser.parse_args()
    path=ROOT/'config.local.json'
    if not path.is_file():print('Run setup.py first.');return 1
    config=json.loads(path.read_text(encoding='utf-8'));ports=config['ports']
    checks={key:Path(config[key]).is_file() for key in ('comfy_python','sdk_python')}
    checks['copied_engine']=(ROOT/'runtime/comfy/main.py').is_file()
    checks['camera_template']=(ROOT/'custom_nodes/ComfyUI-H3-R2V-CameraLipLock/workflows/H3_R2V_Camera_SourceEdit_8Step_API.json').is_file()
    optional={}
    vfx=config.get('nvidia_vfx_python','');dll=config.get('nvoffruc_dll','')
    optional['nvidia_binding_path']=bool(vfx and (ROOT/vfx/'nvvfx').is_dir())
    optional['fruc_dll_path']=bool(dll and (ROOT/dll).is_file())
    models=Path(config['models_directory'])
    optional['local_asr']=(models/'whisper/faster-whisper-small/model.bin').is_file()
    optional['face_detector']=any((models/'ultralytics').rglob('face_yolov8m.pt')) if (models/'ultralytics').is_dir() else False
    result=dict(scope='paths, model selections and registered nodes only; no GPU render/quality certification',checks=checks,optional=optional)
    try:
        cfg=fetch(f"http://127.0.0.1:{ports['comfy']}/endless_h3_aio/config")
        assets=cfg['models'];settings=cfg['default_plan']['settings']
        result['default_model_selections']={key:settings[key] in assets[kind] for key,kind in (
            ('model','model'),('clip','clip'),('video_vae','vae'),('audio_vae','vae'),('turbo_lora','loras'))}
        result['features']=fetch(f"http://127.0.0.1:{ports['comfy']}/endless_h3_aio/dependencies")
        result['sdk_service']=fetch(f"http://127.0.0.1:{ports['sdk_service']}/health")
    except (OSError,ValueError) as error:result['server_error']=str(error)
    result['base_ready']=all(checks.values()) and not result.get('server_error') and all(result.get('default_model_selections',{}).values())
    text=json.dumps(result,indent=2)
    if args.output:args.output.write_text(text,encoding='utf-8')
    print(text);return 0 if result['base_ready'] else 1


if __name__=='__main__':raise SystemExit(main())
