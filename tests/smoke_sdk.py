"""Real SDK/engine round trip with CPU fixtures, not a model-quality benchmark."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import uuid

import httpx
from comfy_sdk import Comfy

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'custom_nodes/ComfyUI-Endless-H3-AllInOne'))
from project_store import ProjectStore


def main():
    config=json.loads((ROOT/'config.local.json').read_text(encoding='utf-8'))
    ports=config['ports'];os.environ['COMFY_BASE_URL']=f"http://127.0.0.1:{ports['proxy']}"
    report={'scope':'real official SDK/proxy/isolated ComfyUI, synthetic CPU video fixtures','checks':{}}
    def check(name,value):
        report['checks'][name]=bool(value)
        assert value,name
    with httpx.Client(base_url=f"http://127.0.0.1:{ports['comfy']}",trust_env=False,timeout=120) as http,Comfy() as sdk:
        graph={'1':{'class_type':'EmptyImage','inputs':{'width':32,'height':32,'batch_size':24,'color':3368601}},
            '2':{'class_type':'CreateVideo','inputs':{'images':['1',0],'fps':24.0}},
            '3':{'class_type':'SaveVideo','inputs':{'video':['2',0],'filename_prefix':'SDK_CHECK/fixture','format':'mp4','format.codec':'h264'}}}
        payload={'graph':graph,'request_key':str(uuid.uuid4())}
        response=http.post('/endless_h3_aio/sdk/queue',json=payload);response.raise_for_status()
        identifier=response.json()['prompt_id'];job=sdk.jobs.get(identifier).wait(timeout=60)
        check('official_sdk_job_succeeded',job.status=='succeeded')
        check('submitted_graph_preserved',job.get_workflow().graph==graph)
        output=next(o for o in job.outputs if o.content_type.startswith('video/'))
        downloaded=output.to_file(str(ROOT/'runtime/sdk_fixture.mp4'))
        check('output_downloaded',downloaded.stat().st_size>0)
        replay=http.post('/endless_h3_aio/sdk/queue',json=payload)
        check('duplicate_request_recovers_same_job',replay.status_code==200 and replay.json()['prompt_id']==identifier)
        recovered=http.get('/endless_h3_aio/sdk/request/'+payload['request_key']).json()
        check('request_key_recovery',recovered['prompt_id']==identifier)
        invalid=http.post('/endless_h3_aio/sdk/queue',json={'graph':{'1':{'class_type':'MissingFixtureNode','inputs':{}}},'request_key':str(uuid.uuid4())})
        check('bad_graph_definitively_rejected',invalid.status_code>=400 and invalid.json().get('submission_uncertain') is False)
        cfg=http.get('/endless_h3_aio/config').json()
        check('motion_repair_default_off',cfg['default_plan']['settings']['motion_repair']=='Off')
        created=http.post('/endless_h3_aio/project',json={'name':'SDK synthetic round trip','plan':cfg['default_plan']})
        created.raise_for_status();pid=created.json()['id']
        store=ProjectStore(ROOT/'runtime/data/output');project=store.load(pid)
        folder=store.folder(pid)/'jobs/fixture';folder.mkdir(parents=True)
        video=folder/'video.mp4';video.write_bytes(downloaded.read_bytes())
        latent=folder/'not_a_latent.txt';latent.write_text('Normal FFmpeg merge must not decode this fixture.')
        project['clips']['1']=dict(index=1,job='fixture',video=video.relative_to(store.output).as_posix(),latent=latent.relative_to(store.output).as_posix(),frames=24,stale=False,history=[],created=time.time())
        store.write(project)
        response=http.post('/endless_h3_aio/queue',json={'project_id':pid,'plan':project['plan'],'action':'assemble'})
        response.raise_for_status();queued=response.json();merged=sdk.jobs.get(queued['prompt_id']).wait(timeout=60)
        check('assembly_uses_official_sdk',merged.status=='succeeded')
        current=http.get('/endless_h3_aio/project/'+pid).json()
        check('commit_and_sdk_id',current['jobs'][queued['job_id']]['sdk_job_id']==merged.id and current['jobs'][queued['job_id']]['state']=='completed')
        check('active_job_released',current['active'] is None)
        check('gallery_export_exists',len(current['exports'])==1 and store.output_file(current['exports'][0]['video']).is_file())
        history=http.get('/history/'+merged.id).json()[merged.id]
        types={n['class_type'] for n in history['prompt'][2].values()}
        check('normal_merge_no_vae','EndlessH3ConcatClips' in types and not any('VAE' in t for t in types))
        served=http.get('/extensions/ComfyUI-Endless-H3-AllInOne/studio.js')
        check('ui_served',served.status_code==200 and b'Flagship Scene UI' in served.content)
        check('full_korean_font_available',http.get('/extensions/ComfyUI-Endless-H3-AllInOne/fonts/NotoSansKR-variable.ttf').status_code==200)
        registered=http.get('/object_info').json()
        check('scene_merge_nodes_registered',all(k in registered for k in ('EndlessH3StitchScene','EndlessH3ConcatScenes','H3MotionContextClipStitcher -noEmbryo')))
        template=http.get('/h3r2v_camera_lip_lock/runtime_template')
        check('camera_graph_template_available',template.status_code==200 and isinstance(template.json(),dict) and bool(template.json()))
        report.update(job_id=identifier,merge_job_id=merged.id)
    (ROOT/'runtime/sdk_smoke.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
