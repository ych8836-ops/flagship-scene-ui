"""Pinned author overlap math + real encoding/FFmpeg, using deterministic VAE decoder fixtures."""
from pathlib import Path
import importlib.util, json, sys, tempfile, types
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
if not (ROOT/'runtime/comfy/main.py').is_file():
    print('SKIP: requires setup.py and the Comfy engine Python; this is not a pure-source CI test.')
    raise SystemExit(0)
sys.path.insert(0,str(ROOT/'runtime/comfy'));sys.argv=[sys.argv[0],'--cpu']
import torch
torch.set_num_threads(4)
import nodes
from safetensors.torch import save_file

def package(name,folder):
    parent=types.ModuleType(name);parent.__path__=[str(folder)];sys.modules[name]=parent
    def load(module):
        key=name+'.'+module
        if key in sys.modules:return sys.modules[key]
        spec=importlib.util.spec_from_file_location(key,folder/(module+'.py'))
        result=importlib.util.module_from_spec(spec);sys.modules[key]=result;spec.loader.exec_module(result);return result
    return load

load=package('scene_fixture_app',ROOT/'custom_nodes/ComfyUI-Endless-H3-AllInOne')
builder=load('prompt_builder');store_type=load('project_store').ProjectStore;scene=load('scene_assembly')
author=package('scene_fixture_author',ROOT/'runtime/external_nodes/ComfyUI-noEmbryo')('minimax')
motion=package('scene_fixture_motion',ROOT/'runtime/dependencies/motion_context')('nodes')
nodes.NODE_CLASS_MAPPINGS.update({'H3MotionContextClipStitcher -noEmbryo':author.H3MotionContextClipStitcher,
    'EndlessV15MiniMaxH3MotionContextTrim':motion.MiniMaxH3MotionContextTrim})
def video_decode(vae,latent):return latent[0,0,:,0,0,None,None,None].expand(-1,32,32,3).clone()
def audio_decode(vae,latent):return {'sample_rate':24000,'waveform':latent[:,0,:1,:].repeat_interleave(1000,dim=-1)}

with tempfile.TemporaryDirectory(dir=ROOT/'runtime') as temporary:
    store=store_type(Path(temporary));raw=builder.default_plan();raw['sequence_mode']=True
    raw['scenes']=[dict(id='a',name='A'),dict(id='b',name='B',continue_previous=True)]
    raw['clips']=[dict(prompt='Plain cube.',mode='T2V',scene_id=s,seed=i) for i,s in enumerate(('a','a','b','b'),1)]
    plan=builder.normalize_plan(raw);project=store.create('deterministic scene fixture',plan)
    for i,frames in enumerate((124,119,119,119),1):
        file=store.folder(project['id'])/'fixtures'/f'clip_{i:05d}.safetensors';file.parent.mkdir(exist_ok=True)
        n=frames+(22 if i>1 else 0)
        save_file({'video':torch.full((1,1,n,1,1),i/6),'audio':torch.full((1,1,2,n),i/6)},str(file))
        project['clips'][str(i)]=dict(latent=file.relative_to(store.output).as_posix(),frames=frames)
    job=dict(id='b'*32,action='assemble',index=4,plan=plan);project['jobs'][job['id']]=job;store.write(project)
    graph=builder.build_prompt(project,job,store,preview=True)
    types_in_graph=[n['class_type'] for n in graph.values()]
    assert types_in_graph.count('EndlessH3StitchScene')==2 and 'EndlessH3ConcatScenes' in types_in_graph
    with patch.object(author,'_decode_video',video_decode),patch.object(author,'_decode_audio',audio_decode),\
         patch.object(author,'get_original_node_id',None),patch.object(author.comfy.model_management,'soft_empty_cache',lambda:None):
        first=scene.stitch_scene(store,project['id'],job['id'],1,object(),object())
        manifest=scene.stitch_scene(store,project['id'],job['id'],2,object(),object(),first)
        output,frames=scene.concat_scenes(store,project['id'],job['id'],manifest)
    assert [e['frames'] for e in json.loads(manifest)]==[243,238] and frames==481 and output.is_file()
report=dict(total_frames=481,scene_frames=[243,238],real_upstream_overlap=True,real_mp4_and_ffmpeg=True,fake_vae_decoders=True)
(ROOT/'runtime/scene_assembly_check.json').write_text(json.dumps(report,indent=2))
print('PASS: pinned Endless AV scenes -> automatic FFmpeg, context prefix removed once, 481 delivered frames.')
