"""Read-only check for the selected features; installation remains a separate user action."""
import argparse
import importlib.util
import json
from pathlib import Path
import urllib.request
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('flagship_dependencies', ROOT/'custom_nodes/ComfyUI-Endless-H3-AllInOne/dependencies.py')
deps = importlib.util.module_from_spec(spec);spec.loader.exec_module(deps)


def url(value):
    parsed=urlparse(value)
    if parsed.scheme not in ('http','https') or not parsed.netloc:raise argparse.ArgumentTypeError('Use an http(s) ComfyUI URL.')
    return value.rstrip('/')


def fetch(value):
    with urllib.request.urlopen(value,timeout=10) as response:return json.load(response)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',required=True,type=url)
    parser.add_argument('--features',nargs='+',choices=list(deps.FEATURES),default=['generation'])
    parser.add_argument('--sdk-url',type=url)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    try:
        registered=fetch(args.url+'/object_info')
        features=deps.feature_report(registered)
        result={'scope':'node registration only; models, GPU kernels and media quality require runtime checks',
                'features':{name:features[name] for name in args.features},
                'ready':all(features[name]['ready'] for name in args.features)}
        if args.sdk_url:
            health=fetch(args.sdk_url+'/health')
            result['sdk_service']=health
            result['ready']=result['ready'] and health.get('execution')=='comfy-sdk'
    except (OSError,ValueError) as error:
        result={'ready':False,'error':str(error)}
    text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:args.output.write_text(text,encoding='utf-8')
    print(text)
    return 0 if result['ready'] else 1


if __name__=='__main__':raise SystemExit(main())
