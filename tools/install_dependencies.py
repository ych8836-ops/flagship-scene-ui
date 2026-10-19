"""Install pinned external code/assets into this isolated app, never production."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parents[1]


def within(value):
    target=(ROOT/value).resolve()
    if not target.is_relative_to(ROOT) or target==ROOT:
        raise ValueError('Dependency path must stay inside this app.')
    return target


def download(item, cache):
    candidate=cache/(item['id']+('.zip' if 'repo' in item else '.download')) if cache else None
    if candidate and candidate.is_file():data=candidate.read_bytes()
    else:
        if not item['url'].startswith('https://'):raise ValueError('HTTPS dependency URL required')
        request=urllib.request.Request(item['url'],headers={'User-Agent':'Flagship-Scene-UI/1.0'})
        with urllib.request.urlopen(request,timeout=120) as response:data=response.read()
    if hashlib.sha256(data).hexdigest()!=item['sha256']:
        raise ValueError('Dependency checksum mismatch: '+item['id'])
    return data


def install(features, cache=None):
    within('runtime').mkdir(parents=True,exist_ok=True)
    lock=json.loads((ROOT/'dependencies.lock.json').read_text(encoding='utf-8'))
    records=[]
    for item in lock['repositories']:
        if item['feature'] not in features:continue
        target=within('runtime/external_nodes/'+item['folder'])
        marker=target/'.flagship-dependency.json'
        if marker.is_file():
            if json.loads(marker.read_text())['sha256']!=item['sha256']:raise ValueError('Existing dependency differs: '+str(target))
            records.append(item);continue
        if target.exists():raise ValueError('Refusing to overwrite an untracked dependency: '+str(target))
        data=download(item,cache)
        staging=within('runtime/install_staging');staging.mkdir(parents=True,exist_ok=True)
        target.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=staging) as temporary:
            payload=Path(temporary)/'payload';payload.mkdir()
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for info in archive.infolist():
                    parts=Path(info.filename).parts[1:]
                    if not parts:continue
                    output=(payload/Path(*parts)).resolve()
                    if not output.is_relative_to(payload):raise ValueError('Archive escapes dependency folder')
                    if info.is_dir():output.mkdir(parents=True,exist_ok=True)
                    else:
                        output.parent.mkdir(parents=True,exist_ok=True)
                        output.write_bytes(archive.read(info))
            if item['id']=='face':
                patch=ROOT/'integrations/face_refine/compatibility.patch'
                subprocess.run(['git','-C',str(payload),'apply','--check',str(patch)],check=True)
                subprocess.run(['git','-C',str(payload),'apply',str(patch)],check=True)
                for name in ('auto_nodes.py','safe_color_nodes.py'):
                    shutil.copy2(ROOT/'integrations/face_refine'/name,payload/name)
                with (payload/'__init__.py').open('a',encoding='utf-8') as stream:
                    stream.write('\nfrom .auto_nodes import NODE_CLASS_MAPPINGS as _auto, NODE_DISPLAY_NAME_MAPPINGS as _auto_names\nfrom .safe_color_nodes import NODE_CLASS_MAPPINGS as _color, NODE_DISPLAY_NAME_MAPPINGS as _color_names\nNODE_CLASS_MAPPINGS.update(_auto)\nNODE_CLASS_MAPPINGS.update(_color)\nNODE_DISPLAY_NAME_MAPPINGS.update(_auto_names)\nNODE_DISPLAY_NAME_MAPPINGS.update(_color_names)\n')
            (payload/marker.name).write_text(json.dumps(item,indent=2))
            payload.replace(target)
        records.append(item)
    for item in lock['files']:
        if item['feature'] not in features:continue
        target=within(item['path'])
        expected=item.get('installed_sha256',item['sha256'])
        if target.is_file():
            digest=hashlib.sha256(target.read_bytes()).hexdigest()
            if digest not in {item['sha256'],expected}:
                raise ValueError('Existing external asset differs: '+str(target))
            data=target.read_bytes()
        else:
            data=download(item,cache)
        if item.get('replace'):
            old,new=item['replace'];data=data.replace(old.encode(),new.encode())
        if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Installed asset checksum mismatch: '+item['id'])
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        records.append(item)
    if 'core' in features:
        (within('runtime/dependencies/motion_context')/'__init__.py').write_text('from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS\n',encoding='utf-8')
    (within('runtime')/'dependencies.local.json').write_text(json.dumps(records,indent=2))
    print(f'Installed/verified {len(records)} pinned dependencies inside this app only.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--features',nargs='+',choices=['core','ui','camera','spectrum','repair','extra'],default=['core','ui','camera'])
    parser.add_argument('--cache',type=Path,help='Optional local archive cache; SHA256 still verified')
    args=parser.parse_args();install(set(args.features),args.cache)
