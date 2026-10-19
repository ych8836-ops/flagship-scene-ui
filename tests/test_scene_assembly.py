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

results=[]
for label,sequence,scene_ids,counts,scene_counts in [
    ('sequence_continuing_boundary',True,('a','a','b','b'),(124,119,119,119),(243,238)),
    ('sequence_fresh_boundary',True,('a','a','b','b'),(124,119,124,119),(243,243)),
    ('normal_continuous',False,(None,None,None),(124,119,119),(362,)),
    ('normal_single',False,(None,),(124,),(124,)),
]:
    with tempfile.TemporaryDirectory(dir=ROOT/'runtime') as temporary:
        store=store_type(Path(temporary));raw=builder.default_plan();raw['sequence_mode']=sequence
        raw['scenes']=[dict(id='a',name='A'),dict(id='b',name='B',continue_previous=label.endswith('continuing_boundary'))]
        raw['clips']=[dict(prompt='Plain cube.',mode='T2V',seed=i,**({'scene_id':sid} if sid else {})) for i,sid in enumerate(scene_ids,1)]
        plan=builder.normalize_plan(raw)
        if not sequence:
            # Legacy normal plans need neither scene IDs nor a scenes array.
            plan.pop('scenes',None)
            for clip in plan['clips']:clip.pop('scene_id',None)
        project=store.create(label,plan)
        for i,frames in enumerate(counts,1):
            file=store.folder(project['id'])/'fixtures'/f'clip_{i:05d}.safetensors';file.parent.mkdir(exist_ok=True)
            n=frames+scene.overlap_frames(plan,i)
            save_file({'video':torch.full((1,1,n,1,1),i/6),'audio':torch.full((1,1,2,n),i/6)},str(file))
            project['clips'][str(i)]=dict(latent=file.relative_to(store.output).as_posix(),frames=frames)
        job=dict(id='b'*32,action='assemble',index=len(counts),plan=plan);project['jobs'][job['id']]=job;store.write(project)
        graph=builder.build_prompt(project,job,store,preview=True)
        types_in_graph=[n['class_type'] for n in graph.values()]
        assert types_in_graph.count('EndlessH3StitchScene')==len(scene_counts)
        assert 'EndlessH3ConcatScenes' in types_in_graph and 'EndlessH3ConcatClips' not in types_in_graph
        real_stitch=author.H3MotionContextClipStitcher.stitch
        decoded=[]
        def record_stitch(*args,**kwargs):
            value=real_stitch(*args,**kwargs);decoded.append(value[:2]);return value
        with patch.object(author,'_decode_video',video_decode),patch.object(author,'_decode_audio',audio_decode),\
             patch.object(author,'get_original_node_id',None),patch.object(author.comfy.model_management,'soft_empty_cache',lambda:None),\
             patch.object(author.H3MotionContextClipStitcher,'stitch',side_effect=record_stitch),\
             patch.object(scene,'concat_files',wraps=scene.concat_files) as ffmpeg_join:
            manifest='[]'
            for number in range(1,len(scene_counts)+1):
                manifest=scene.stitch_scene(store,project['id'],job['id'],number,object(),object(),manifest)
            output,frames=scene.concat_scenes(store,project['id'],job['id'],manifest)
            assert ffmpeg_join.call_count==(1 if len(scene_counts)>1 else 0)
        assert [e['frames'] for e in json.loads(manifest)]==list(scene_counts)
        assert frames==sum(counts) and output.is_file()
        info=scene.video_info(output)
        assert info['frames']==frames and info['sample_rate']==24000
        import av
        with av.open(str(output)) as container:
            v,a=container.streams.video[0],container.streams.audio[0]
            assert abs(v.duration*v.time_base-a.duration*a.time_base)<=1/24
        if label=='normal_continuous':
            images,audio=decoded[0]
            assert len(images)==362 and audio['waveform'].shape[-1]==362000
            # Real upstream blend, not simple MP4 append: intermediate values exist.
            boundary=images[102:124,0,0,0]
            assert ((boundary>1/6+.001)&(boundary<2/6-.001)).any()
            wave=audio['waveform'][0,0,102000:124000]
            assert ((wave>1/6+.001)&(wave<2/6-.001)).any()
        if len(scene_counts)==1:
            assert output==store.output_file(json.loads(manifest)[0]['video'])
        results.append(dict(case=label,frames=frames,scene_frames=list(scene_counts),ffmpeg_scene_join=len(scene_counts)>1))
        # Missing archives must fail, never silently fall back to MP4 concatenation.
        project['clips']['1']['latent']=project['clips']['1']['latent']+'.missing';store.write(project)
        try:scene.stitch_scene(store,project['id'],job['id'],1,object(),object())
        except scene.ProjectError:pass
        else:raise AssertionError('Missing AV archive was accepted')
report=dict(cases=results,real_upstream_overlap=True,real_mp4_and_ffmpeg=True,fake_vae_decoders=True)
(ROOT/'runtime/scene_assembly_check.json').write_text(json.dumps(report,indent=2))
print('PASS: normal Endless chain/single clip, scene-local Endless -> FFmpeg, AV overlap/timing and missing archives.')
