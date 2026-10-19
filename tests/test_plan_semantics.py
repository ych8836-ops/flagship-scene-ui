"""Graph/ledger checks only: reference selection, scene boundaries and selected-clip retry."""
import copy
import ast, os
from unittest.mock import patch
from pathlib import Path
import tempfile
import uuid
import sys, types, importlib

ROOT=Path(__file__).resolve().parents[1]
package=types.ModuleType('flagship_plan_test')
package.__path__=[str(ROOT/'custom_nodes/ComfyUI-Endless-H3-AllInOne')]
sys.modules[package.__name__]=package
NEW=importlib.import_module(package.__name__+'.prompt_builder')
Store=importlib.import_module(package.__name__+'.project_store').ProjectStore
(ROOT/'runtime').mkdir(exist_ok=True)


with tempfile.TemporaryDirectory(dir=ROOT/'runtime') as temporary:
    store=Store(Path(temporary))
    plan=NEW.default_plan()
    plan['references']['images']=['one.png','two.png','unused.png']
    base={'mode':'R2V','seconds':5,'seed':123,'first_image':'','last_image':'','images':[],
          'videos':[],'audios':[],'use_common_references':True}
    plan['sequence_mode']=True
    plan['scenes']=[{'id':'a','name':'A'}, {'id':'b','name':'B'}]
    plan['clips']=[dict(base,prompt='The woman from @picture_1 smiles.',scene_id='a'),
                   dict(base,prompt='Continue with @picture_2.',scene_id='a'),
                   dict(base,prompt='A fresh scene with @picture_1.',scene_id='b')]
    plan=NEW.normalize_plan(plan)
    p=store.create('graph-only',plan)
    for index in [1,2,3]:
        folder=store.folder(p['id'])/'fixture'/str(index);folder.mkdir(parents=True)
        for name in ['latent.txt','video.mp4']:(folder/name).write_text('graph/ledger fixture; not video inference')
        p['clips'][str(index)]={'index':index,'job':uuid.uuid4().hex,'frames':124,'stale':False,
            'latent':(folder/'latent.txt').relative_to(store.output).as_posix(),
            'video':(folder/'video.mp4').relative_to(store.output).as_posix(),'history':[]}
    store.write(p)
    for index in [1,2,3]:
        job={'id':uuid.uuid4().hex,'index':index,'action':'retry','plan':plan}
        new=NEW.build_prompt(p,job,store,preview=True)
        images=[n['inputs']['image'] for n in new.values() if n['class_type']=='LoadImage']
        assert images==[['one.png'],['two.png'],['one.png']][index-1]
        has_context=any(n['class_type']=='EndlessV15MiniMaxH3MotionContextLoadLatent' for n in new.values())
        assert has_context==(index==2)
    for sequence in (False,True):
        assembly_plan=copy.deepcopy(plan);assembly_plan['sequence_mode']=sequence
        if not sequence:
            assembly_plan.pop('scenes',None)
            for clip in assembly_plan['clips']:clip.pop('scene_id',None)
        for audio in ('','voice.wav'):
            assembly_plan['settings']['audio_file']=audio
            assembly={'id':uuid.uuid4().hex,'index':3,'action':'assemble','plan':assembly_plan}
            graph=NEW.build_prompt(p,assembly,store,preview=True)
            types=[n['class_type'] for n in graph.values()]
            assert types.count('EndlessH3StitchScene')==(2 if sequence else 1)
            assert 'EndlessH3ConcatScenes' in types and 'EndlessH3ConcatClips' not in types
            assert types.count('VAELoader')==(1 if audio else 2)
            assert ('LoadAudio' in types)==bool(audio)
    before=copy.deepcopy(p['clips'])
    reserved,job=store.reserve(p['id'],plan,'retry',2)
    assert job['index']==2 and reserved['active']==job['id']
    assert reserved['clips']==before and len(reserved['jobs'])==1
    assert before['1']==reserved['clips']['1'] and before['3']==reserved['clips']['3']
# Run the actual guard without importing the engine's server/route initialization.
source=ast.parse((ROOT/'custom_nodes/ComfyUI-Endless-H3-AllInOne/__init__.py').read_text(encoding='utf-8'))
guard=next(n for n in source.body if isinstance(n,ast.FunctionDef) and n.name=='check_assets')
namespace={'os':os,'ProjectError':ValueError}
exec(compile(ast.Module(body=[guard],type_ignores=[]),'check_assets','exec'),namespace)
with patch.dict(os.environ,{'FLAGSHIP_SDK_TEST_CPU':'1'}):
    for sequence in (False,True):
        try:namespace['check_assets']({'sequence_mode':sequence},1,'assemble')
        except ValueError as error:assert 'CPU' in str(error)
        else:raise AssertionError('AV assembly bypassed CPU/model guard')
print('PASS: tagged references, scene boundaries, selected retry, Endless graphs and CPU assembly guards.')
