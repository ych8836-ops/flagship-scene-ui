import assert from 'node:assert/strict';
import {StudioSDKEvents} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/sdk_events.js';

class Source {
    static instances = [];
    constructor(url) { this.url = url; Source.instances.push(this); }
    close() { this.closed = true; }
    send(data) { this.onmessage({data:JSON.stringify(data)}); }
}
const api = new EventTarget(); api.apiURL = path => path;
const finished = [], events = [];
for (const name of ['execution_start','progress','b_preview_with_metadata','execution_success','execution_interrupted']) {
    api.addEventListener(name, event => events.push([name,event.detail]));
}
const bridge = new StudioSDKEvents(api, id => finished.push(id), Source);
bridge.sync(['a']); bridge.sync(['a']); assert.equal(Source.instances.length, 1);
const source = Source.instances[0];
source.send({kind:'preview',prompt_id:'wrong',mime:'image/png',data:'AQI='}); assert.equal(events.length,0);
source.send({kind:'status',prompt_id:'a',status:'running'});
source.send({kind:'progress',prompt_id:'a',step:2,steps:12});
source.send({kind:'preview',prompt_id:'a',mime:'image/png',data:'AQI='});
assert.equal(events[0][0], 'execution_start');
assert.equal(events[1][1].value, 2); assert.equal(events[1][1].max,12);
assert.equal(events[2][1].jobId,'a'); assert.deepEqual([...new Uint8Array(await events[2][1].blob.arrayBuffer())],[1,2]);
source.send({kind:'status',prompt_id:'a',status:'succeeded'});
assert.equal(events.at(-1)[0], 'execution_success'); assert.equal(source.closed,true);
bridge.watch('a'); assert.equal(Source.instances.length,1); assert.deepEqual(finished,['a']);
bridge.sync(['b']); Source.instances[1].send({kind:'status',prompt_id:'b',status:'canceled'});
assert.equal(events.at(-1)[0],'execution_interrupted');
bridge.sync(['c']); bridge.dispose(); assert.equal(Source.instances[2].closed,true);
console.log('PASS: SDK progress, job-scoped preview, terminal events, duplicate watchers and cleanup.');
