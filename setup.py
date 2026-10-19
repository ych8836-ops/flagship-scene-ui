"""Prepare a separate SDK app; source ComfyUI and its Python are read-only inputs."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parent


def prepare(comfy,comfy_python,sdk_python,models,ports):
    comfy=comfy.resolve();comfy_python=comfy_python.resolve();sdk_python=sdk_python.resolve();models=models.resolve()
    if not (comfy/'main.py').is_file() or not (comfy/'comfy_extras/nodes_minimax_h3.py').is_file():
        raise ValueError('Choose a ComfyUI folder with native MiniMax H3 support.')
    if not all(p.is_file() for p in (comfy_python,sdk_python)):raise ValueError('Select existing Comfy and SDK Python executables.')
    if not models.is_dir():raise ValueError('Models directory does not exist.')
    runtime=ROOT/'runtime';runtime.mkdir(exist_ok=True)
    target=runtime/'comfy'
    if target.resolve().is_relative_to(comfy) or comfy.is_relative_to(ROOT):raise ValueError('Source Comfy must be outside this isolated app.')
    marker=runtime/'source.local.json'
    if target.exists():
        if not marker.is_file() or json.loads(marker.read_text())['source']!=str(comfy):
            raise ValueError('This app already has a different/unfinished Comfy copy. Use another app folder.')
    else:
        def ignore(directory,names):
            skipped={'.git','__pycache__','node_modules','.venv'}
            if Path(directory)==comfy:
                skipped.update({'models','custom_nodes','input','output','temp','user','extra_model_paths.yaml','.env'})
            return set(names)&skipped
        shutil.copytree(comfy,target,ignore=ignore)
        (target/'custom_nodes').mkdir(exist_ok=True)
        marker.write_text(json.dumps({'source':str(comfy)},indent=2))
    for name in ('input','output','temp','user','custom_nodes'):(runtime/'data'/name).mkdir(parents=True,exist_ok=True)
    (runtime/'yolo_config').mkdir(exist_ok=True)
    paths={'flagship':{'custom_nodes':str(ROOT/'custom_nodes')+'\n'+str(runtime/'external_nodes'),
        'model_patches':str(models/'controlnet'), 'geometry_estimation':str(models/'geometry_estimation'),
        'flagship_segmenters':str(models/'flagship_segmenters')}}
    # JSON is a YAML subset and avoids quoting Windows paths by hand.
    (runtime/'paths.local.yaml').write_text(json.dumps(paths,indent=2),encoding='utf-8')
    config=dict(comfy_python=str(comfy_python),sdk_python=str(sdk_python),models_directory=str(models),
        ports=dict(zip(('comfy','proxy','sdk_service'),ports)),nvidia_vfx_python='',nvoffruc_dll='')
    path=ROOT/'config.local.json'
    if path.is_file():
        old=json.loads(path.read_text(encoding='utf-8'))
        for key in ('nvidia_vfx_python','nvoffruc_dll'):config[key]=old.get(key,'')
    path.write_text(json.dumps(config,indent=2),encoding='utf-8')
    print('Independent SDK app prepared. Original ComfyUI and packages were not changed.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--comfy',type=Path)
    parser.add_argument('--comfy-python',type=Path)
    parser.add_argument('--sdk-python',type=Path,help='Existing Python with service/requirements.txt installed')
    parser.add_argument('--models',type=Path)
    parser.add_argument('--ports',nargs=3,type=int,default=[18881,18882,18883])
    parser.add_argument('--create-sdk-env',action='store_true')
    parser.add_argument('--install-dependencies',action='store_true')
    parser.add_argument('--features',nargs='+',default=['core','ui','camera'])
    parser.add_argument('--cache',type=Path)
    args=parser.parse_args()
    comfy=args.comfy or Path(input('ComfyUI folder (read-only source): ').strip().strip('"'))
    engine=args.comfy_python
    if engine is None:
        candidate=comfy.parent/'python_embeded/python.exe'
        engine=candidate if candidate.is_file() else Path(input('ComfyUI Python executable: ').strip().strip('"'))
    sdk=args.sdk_python
    if args.create_sdk_env:
        env=ROOT/'.sdk-venv'
        if not env.exists():subprocess.run([sys.executable,'-m','venv',str(env)],check=True)
        sdk=env/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
        subprocess.run([str(sdk),'-m','pip','install','-r',str(ROOT/'service/requirements.txt')],check=True)
    if sdk is None:raise ValueError('Use --create-sdk-env with standard Python or provide --sdk-python.')
    if len(set(args.ports))!=3 or any(not 1024<=p<=65535 for p in args.ports):raise ValueError('Choose three distinct ports from 1024–65535.')
    prepare(comfy,engine,sdk,args.models or comfy/'models',args.ports)
    if args.install_dependencies:
        from tools.install_dependencies import install
        install(set(args.features),args.cache)


if __name__=='__main__':main()
