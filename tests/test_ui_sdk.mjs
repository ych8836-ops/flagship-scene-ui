import fs from 'node:fs';
import {CameraMotionPreview,cameraGuide,cameraDemoState,projectDemoPoint} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_motion_preview.js';
import vm from 'node:vm';
import {StudioActionPreview,studioActionFor} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio_action_preview.js';
import assert from 'node:assert/strict';
import {StudioDockLayout} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio_layout.js';
import {PreviewNodes, previewNodeModel, nodeLocation} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/preview_nodes.js';
import {StudioLivePreview} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/live_preview.js';
import {StudioCameraWindow} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_window.js';
import {SHOTS,ANGLES,MOVES,LENSES,FOCUS,EASINGS,cameraDirectionPrompt,normalizeCameraSegment,applyCameraDirections} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_controls.js';
import {applyCameraSettings,cameraTimelineInputs} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_graph.js';
import {CAMERA_GUIDE_MODELS} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_corrections.js';
import * as cameraGraph from '../custom_nodes/ComfyUI-H3-R2V-CameraLipLock/web/camera_dynamic_graph.js';
import * as sequence from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/sequence.js';
import * as localization from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/i18n.js';

class Element {
    constructor(tag) {
        this.tagName=tag.toLowerCase(); this.children=[]; this.parentElement=null; this.dataset={}; this.attrs={}; this.events={};
        this.className=''; this.style={setProperty(k,v){this[k]=v;}}; this.scrollTop=0; this.scrollLeft=0; this.value=''; this.hidden=false;
        this.clientWidth=1280; this.clientHeight=660; this.offsetHeight=44; this.zoom=1;
        this.classList={contains:c=>this.className.split(' ').includes(c), add:(...c)=>c.forEach(v=>this.classList.toggle(v,true)),remove:(...c)=>c.forEach(v=>this.classList.toggle(v,false)),
            toggle:(c,on)=>{const s=new Set(this.className.split(' ').filter(Boolean)); const yes=on??!s.has(c); yes?s.add(c):s.delete(c); this.className=[...s].join(' ');return yes;}};
    }
    append(...nodes){for(let n of nodes){if(typeof n==='string')n=Object.assign(new Element('text'),{textContent:n});n.remove();this.children.push(n);n.parentElement=this;}}
    prepend(...nodes){for(const n of [...nodes].reverse())this.insertBefore(n,this.firstChild);}
    appendChild(n){this.append(n);return n;}
    insertBefore(n,ref){if(!ref){this.append(n);return;}n.remove();const i=this.children.indexOf(ref);assert.ok(i>=0);this.children.splice(i,0,n);n.parentElement=this;}
    before(n){this.parentElement.insertBefore(n,this);}
    replaceChildren(...nodes){for(const c of this.children)c.parentElement=null;this.children=[];this._text='';this.append(...nodes);}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
    get textContent(){return (this._text||'')+this.children.map(n=>n.textContent).join('');}
    set textContent(t){this.replaceChildren();this._text=String(t);}
    get parentNode(){return this.parentElement;}
    get previousElementSibling(){const list=this.parentElement?.children||[];return list[list.indexOf(this)-1];}
    get nextSibling(){const list=this.parentElement?.children||[];return list[list.indexOf(this)+1];}
    get firstChild(){return this.children[0];}
    get selectedOptions(){return this.options.filter(n=>n.value===this.value);}
    get options(){return this.children.filter(n=>n.tagName==='option');}
    setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
    getAttribute(k){if(k.startsWith('data-'))return this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??null;return this.attrs[k]??null;}
    removeAttribute(k){delete this.attrs[k];if(k==='src')this.src='';}
    matches(s){
        const attrs=[...s.matchAll(/\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]/g)];
        if(attrs.some(([,k,v])=>this.getAttribute(k)===null||(v!==undefined&&this.getAttribute(k)!==v)))return false;
        s=s.replace(/\[[^\]]+\]/g,'');const tag=s.match(/^[\w-]+/)?.[0];
        return (!tag||this.tagName===tag)&&[...s.matchAll(/\.([\w-]+)/g)].every(([,c])=>this.classList.contains(c));
    }
    querySelectorAll(selector){const all=[];const visit=n=>{for(const c of n.children){all.push(c);visit(c);}};visit(this);return all.filter(n=>selector.split(',').some(s=>{
        const parts=s.trim().split(/\s+/);if(!n.matches(parts.pop()))return false;let p=n.parentElement;
        while(parts.length){const target=parts.pop();while(p&&!p.matches(target))p=p.parentElement;if(!p)return false;p=p.parentElement;}return true;
    }));}
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    closest(s){return this.matches(s)?this:this.parentElement?.closest(s)||null;}
    contains(n){return n===this||this.children.some(c=>c.contains(n));}
    addEventListener(k,f,options){const list=this.events[k]??=[];options===true?list.unshift(f):list.push(f);}
    removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(fn=>fn!==f);}
    dispatchEvent(e){let stopped=false;const prior=e.stopImmediatePropagation;e.stopImmediatePropagation=()=>{stopped=true;prior?.();};for(const f of this.events[e.type]||[]){f(e);if(stopped)break;}}
    fire(type,data={}){this.dispatchEvent({type,target:this,preventDefault(){},stopPropagation(){},pointerId:1,button:0,clientX:0,clientY:0,...data});}
    click(){this.fire('click');}
    focus(){document.activeElement=this;this.fire('focus');}
    getBoundingClientRect(){if(this.classList.contains('eh3-camera-window'))return {left:parseFloat(this.style.left)||0,top:parseFloat(this.style.top)||0,width:parseFloat(this.style.width)||620,height:parseFloat(this.style.height)||760};return {left:0,top:0,width:this.clientWidth*this.zoom,height:this.clientHeight*this.zoom,right:this.clientWidth*this.zoom,bottom:this.clientHeight*this.zoom};}
    getContext(kind){if(kind!=='2d')return null;return new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
    pause(){this.paused=true;}
    load(){}
    play(){this.paused=false;return Promise.resolve();}
    showPopover(){this.topLayer=true;}
    hidePopover(){this.topLayer=false;}
    setPointerCapture(){}
    releasePointerCapture(){}
    close(){this.open=false;}
}
globalThis.document={events:{},addEventListener:Element.prototype.addEventListener,removeEventListener:Element.prototype.removeEventListener,dispatchEvent:Element.prototype.dispatchEvent,createElement:tag=>new Element(tag),head:new Element('head'),body:new Element('body'),activeElement:null,
    getElementById(id){return [this.head,this.body,...this.head.querySelectorAll('*'),...this.body.querySelectorAll('*')].find(node=>node.id===id)||null;}};
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
let frames=[];globalThis.requestAnimationFrame=f=>frames.push(f);
globalThis.cancelAnimationFrame=id=>{frames[id-1]=null;};
globalThis.IntersectionObserver=class{observe(){}disconnect(){}};
globalThis.layoutObservers=[];globalThis.ResizeObserver=class{constructor(fn){this.callback=fn;layoutObservers.push(this);}observe(node){this.node=node;}disconnect(){this.dead=true;}};
const api={listeners:new Map(),addEventListener(k,f){const set=this.listeners.get(k)||new Set();set.add(f);this.listeners.set(k,set);},removeEventListener(k,f){this.listeners.get(k)?.delete(f);},fire(k,detail){for(const f of this.listeners.get(k)||[])f({detail});},apiURL:p=>p};
let registrations=[];const app={registerExtension:e=>registrations.push(e),graph:{_nodes:[],setDirtyCanvas(){}},canvas:{setDirty(){}}};
let source=fs.readFileSync(new URL('../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio.js',import.meta.url).href));
globalThis.window={innerWidth:1600,innerHeight:1000,addEventListener(){},removeEventListener(){}};

const schema=JSON.parse(fs.readFileSync(new URL('fixtures/schema.json',import.meta.url),'utf8')).H3R2VCameraTimeline;
const runtime=JSON.parse(fs.readFileSync(new URL('fixtures/runtime.json',import.meta.url),'utf8'));
class TestCameraWindow extends StudioCameraWindow {constructor(studio,api){super(studio,api,async()=>({...cameraGraph,materializeCameraWorkflow:original=>cameraGraph.materializeCameraWorkflow(original,async()=>structuredClone(runtime))}));}}
const context=vm.createContext({StudioSDKEvents:class {},document,window,app,api,StudioActionPreview,StudioCameraWindow:TestCameraWindow,StudioDockLayout,StudioLivePreview,PreviewNodes,previewNodeModel,nodeLocation,...sequence,...localization,
    URL,URLSearchParams,File,Blob,localStorage,IntersectionObserver,ResizeObserver,requestAnimationFrame,console,setInterval:()=>0,clearInterval(){},setTimeout,clearTimeout});
new vm.Script(source+'\nglobalThis.Studio=EndlessStudio;').runInContext(context);
const config=JSON.parse(fs.readFileSync(new URL('fixtures/config_test.json',import.meta.url),'utf8'));
function studio(mode='I2V') {
    const ui=Object.create(context.Studio.prototype);ui.sdkEvents={watch(){},sync(){},dispose(){}};
    Object.assign(ui,{node:{properties:{},setDirtyCanvas(){}},widget:{value:'{}'},config:structuredClone(config),state:{name:'UI check',plan:structuredClone(config.default_plan)},
        selected:0,selectedClips:new Set([0]),galleryProjects:new Map(),outputSelection:new Set(),galleryScope:'all',generationMode:'clip',previewKind:'clip',root:new Element('div'),busyRequest:false,dirty:false,project:null});
    ui.state.plan.clips[0].mode=mode;ui.render();return ui;
}
const ui=studio();
assert.equal(ui.node.properties.endless_font_scale,1.5);
assert.equal(ui.root.style['--font-scale'],'1.5');
ui.setUIFontScale(130);ui.render();assert.equal(ui.node.properties.endless_font_scale,1.3);
delete ui.node.properties.endless_font_revision;ui.node.properties.endless_font_scale=1.1;ui.render();assert.equal(ui.node.properties.endless_font_scale,1.5);
delete ui.node.properties.endless_font_revision;ui.node.properties.endless_font_scale=1.8;ui.render();assert.equal(ui.node.properties.endless_font_scale,1.8);
ui.setUIFontScale(150);ui.render();
console.log('PASS: existing 110% becomes 150%, larger preferences and subsequent manual adjustments survive reload.');
assert.equal(ui.root.querySelectorAll('[data-studio-panel]').length,3);
assert.match(ui.root.textContent,/Flagship Scene UI/);
assert.ok(ui.inputRail.contains(ui.inputPanel));assert.ok(ui.inputRail.contains(ui.audioPanel));
assert.ok(ui.panelLayout.parts['2'].contains(ui.galleryList));assert.ok(!ui.results.contains(ui.previewNodes.root));
assert.ok(ui.controls.textContent.includes('LoRA'));assert.ok(ui.controls.textContent.includes('옵티마이저'));
assert.ok(ui.root.textContent.includes('전체 생성+합치기'));assert.ok(ui.root.textContent.includes('선택 영상 업스케일'));
assert.ok(ui.inputPanel.textContent.includes('첫 클립 시작 이미지'));assert.ok(ui.inputPanel.textContent.includes('끝 이미지'));
ui.state.plan.clips[0].mode='T2V';ui.render();assert.ok(!ui.inputPanel.textContent.includes('끝 이미지'));
ui.state.plan.clips[0].mode='R2V';ui.state.plan.references={images:['a.png'],videos:[{name:'v.mp4',use_audio:false}],audios:['a.wav']};ui.render();
assert.ok(ui.cameraButton);assert.ok(!ui.inputPanel.textContent.includes('끝 이미지'));
assert.equal(ui.inputPanel.querySelectorAll('.eh3-reference-card').length,3);
assert.equal(ui.inputPanel.querySelector('.eh3-input-toolbar').querySelectorAll('.eh3-reference-card').length,0);
assert.equal(ui.inputPanel.querySelector('.eh3-input-media').querySelectorAll('.eh3-references').length,3);
assert.ok(ui.inputPanel.querySelector('.eh3-input-utilities').contains(ui.audioPanel));
const currentClip=ui.state.plan.clips[0];
const leftHeader=()=>ui.panelLayout.panels.find(p=>p.dataset.studioPanel==='1').querySelector('.eh3-pane-header');
assert.ok(leftHeader().contains(ui.cameraButton));assert.ok(!ui.controls.contains(ui.cameraButton));
assert.equal(ui.cameraButton.disabled,false);assert.ok(ui.cameraButton.classList.contains('selected'));
ui.state.plan.references.videos=[];ui.render();assert.equal(ui.cameraButton.disabled,true);ui.updateStatus();assert.equal(ui.cameraButton.disabled,true);
ui.state.plan.references.videos=['legacy.mp4'];ui.render();assert.equal(ui.cameraButton.disabled,false);assert.equal(ui.state.plan.references.videos[0].name,'legacy.mp4');
currentClip.use_common_references=false;currentClip.videos=[];ui.render();assert.equal(ui.cameraButton.disabled,true);
currentClip.videos=[{name:'local.mp4',use_audio:false}];ui.render();assert.equal(ui.cameraButton.disabled,false);assert.ok(leftHeader().contains(ui.cameraButton));
currentClip.use_common_references=true;ui.render();
console.log('PASS: camera button pinned in header; empty video stays disabled, common/clip videos enable it, legacy names work.');
const originalSettings=JSON.stringify(ui.state.plan.settings);
const originalPanel=ui.controls,originalGallery=ui.galleryList;
ui.root.querySelector('[data-dock-target="3"]').value='2';ui.root.querySelector('[data-dock-edge="3"]').value='bottom';ui.root.querySelector('[data-dock-apply="3"]').click();
assert.equal(ui.node.properties.endless_dock_layout.dock.b.axis,'y');assert.equal(ui.controls,originalPanel);assert.equal(ui.galleryList,originalGallery);
ui.root.querySelector('[data-panel-max="2"]').click();assert.ok(ui.root.contains(ui.controls));
ui.root.querySelector('[data-panel-max="2"]').click();ui.root.querySelector('[data-dock-reset]').click();
const separator=ui.root.querySelector('.eh3-dock-separator');const split=separator.parentElement;split.zoom=.5;
const layout=ui.node.properties.endless_dock_layout;
const beforeRatio=layout.dock.ratio;
const center=ui.panelLayout.panels.find(p=>p.dataset.studioPanel==='2');
assert.equal(ui.root.querySelector('[data-preview-splitter]'),null);assert.equal(ui.root.querySelector('[data-panel-resize]'),null);
separator.fire('pointerdown');separator.fire('pointermove',{clientX:64});separator.fire('pointerup');
assert.ok(Math.abs(layout.dock.ratio-(beforeRatio+128/(split.clientWidth-32)))<1e-9,'side drag keeps canvas zoom correction');
assert.equal(center.style.width,undefined);assert.equal(center.style.height,undefined);assert.equal(ui.previewArea.style.height,undefined);
assert.equal(ui.root.style['--dock-divider-size'],'32px');
const rightSeparator=ui.root.querySelectorAll('.eh3-dock-separator').find(bar=>bar!==separator&&bar.dataset.axis==='x');
assert.equal(rightSeparator.disabled,false);const beforeRight=layout.dock.b.ratio;
rightSeparator.fire('pointerdown');rightSeparator.fire('pointermove',{clientX:30});rightSeparator.fire('pointerup');assert.ok(layout.dock.b.ratio>beforeRight);
const afterRight=layout.dock.b.ratio;rightSeparator.fire('keydown',{key:'ArrowDown'});assert.equal(layout.dock.b.ratio,afterRight);
assert.equal(JSON.stringify(ui.state.plan.settings),originalSettings);
const savedRatios=JSON.stringify(layout);ui.render();assert.equal(JSON.stringify(ui.node.properties.endless_dock_layout),savedRatios);
ui.project={active:'job',jobs:{job:{id:'job',index:1,action:'retry',state:'running',prompt_id:'p'}},clips:{},plan:ui.state.plan};ui.updateStatus();
assert.ok(ui.generateButton.classList.contains('running'));assert.equal(ui.generateLabel.textContent,'생성 중…');
ui.project.active=null;ui.updateStatus();assert.ok(!ui.generateButton.classList.contains('running'));assert.equal(ui.generateLabel.textContent,'Generate');
assert.equal(ui.cameraButton.disabled,false);
const manualStage=ui.root.querySelector('.eh3-dock-stage');
assert.equal(layoutObservers.filter(o=>o.node===manualStage&&!o.dead).length,0,'workspace has no resize observer');
const layoutBefore=JSON.stringify(ui.node.properties.endless_dock_layout),treeBefore=manualStage.firstChild;
for(const [width,height] of [[1600,1000],[650,400],[1920,1400],[1280,660]]){
 manualStage.clientWidth=width;manualStage.clientHeight=height;
 assert.equal(JSON.stringify(ui.node.properties.endless_dock_layout),layoutBefore);assert.equal(manualStage.firstChild,treeBefore);
}
ui.render();assert.equal(JSON.stringify(ui.node.properties.endless_dock_layout),layoutBefore);
const layoutSource=fs.readFileSync(new URL('../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio_layout.js',import.meta.url),'utf8');
assert.doesNotMatch(layoutSource,/ResizeObserver|resizeTimer|setHeight|panelResize|style\.(width|height)\s*=/);
assert.equal(ui.node.properties.endless_dock_layout.panelWidths,undefined);assert.equal(ui.node.properties.endless_dock_layout.resultsHeight,undefined);
const css=fs.readFileSync(new URL('../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio.css',import.meta.url),'utf8');
assert.equal(css.match(/\{/g).length,css.match(/\}/g).length);assert.doesNotMatch(css,/data-stack=true|eh3-panel-corner/);
assert.match(css,/display:flex; align-items:stretch; width:100%; height:100%/);
assert.match(css,/display:block; flex:1 1 0; min-height:0; min-width:0/);
assert.match(css,/grid-template-areas:'modes launch' 'actions launch' 'status status'/);assert.match(css,/clip-path:polygon\(0 0,calc\(100% - 22px\)/);
assert.match(source,/computeSize: \(\) => \[720, 620\]/);const launch=ui.root.querySelector('.eh3-commandbar');assert.equal(launch.firstChild,ui.generateButton);assert.ok(ui.root.children.indexOf(launch)<ui.root.children.indexOf(ui.inputRail));assert.equal(ui.root.querySelector('.eh3-footer'),null);assert.equal(ui.generateButton.children.length,2);assert.equal(ui.generateButton.querySelector('.eh3-generate-trigger').getAttribute('aria-hidden'),'true');assert.ok(launch.contains(ui.scheduleButton)&&launch.contains(ui.cancelButton)&&launch.contains(ui.modeInputs[0]));
// Flex hosts use weights over remaining space after the 32px divider, filling every width.
const ratios=ui.node.properties.endless_dock_layout.dock;
for(const width of [804,1280,1920,3000]){
 const left=(width-32)*ratios.ratio,right=width-32-left;
 const preview=(right-32)*ratios.b.ratio,graph=right-32-preview;
 assert.ok(Math.abs(left+preview+graph+64-width)<1e-9);
}
const migrated=studio();
migrated.node.properties.endless_dock_layout={dock:{axis:'x',ratio:.25,a:'1',b:{axis:'x',ratio:.61,a:'2',b:'3'}},panelWidths:{'1':300,'2':600,'3':300},panelHeights:{'1':1400},resultsHeight:1300,previewHeight:900};
migrated.render();const converted=migrated.node.properties.endless_dock_layout;
assert.ok(Math.abs(converted.dock.ratio-300/1232)<1e-9);assert.ok(Math.abs(converted.dock.b.ratio-2/3)<1e-9);
assert.equal(converted.panelWidths,undefined);assert.equal(converted.resultsHeight,undefined);migrated.dispose();
console.log('PASS: ratio-based side controls; no fixed panel dimensions, resize observer or layout saves during resize; CSS fills workspace; top launch controls are independent; smaller widget minimum.');
let queued=[],deleted=[],interrupted=[];let cameraQueue={queue_running:[],queue_pending:[]};
let cameraDependenciesAvailable=false;
const correctionInfos={LoadMoGeModel:{input:{required:{model_name:[[CAMERA_GUIDE_MODELS.geometry]]}}},MoGeInference:{input:{}},FlagshipPrepareCameraGeometry:{input:{}},FlagshipDepthRackFocus:{input:{}},FlagshipCameraSourceFraming:{input:{}}};
const sdkCancelled=[];api.fetchApi=async (path,options)=>{if(path==='/endless_h3_aio/sdk/queue'){queued.push({output:JSON.parse(options.body).graph});return {ok:true,json:async()=>({prompt_id:'camera-own'})};}if(path==='/endless_h3_aio/sdk/cancel'){sdkCancelled.push(JSON.parse(options.body).prompt_id);return {ok:true,json:async()=>({})};}return ({ok:true,json:async()=>path==='/queue'?cameraQueue:path.includes('object_info')?{H3R2VCameraTimeline:schema,...(cameraDependenciesAvailable?correctionInfos:{})}:{}});};
api.queuePrompt=async()=>{throw Error('Native queue must never be used by SDK test');};
api.deleteItem=async(...args)=>deleted.push(args);api.interrupt=async id=>interrupted.push(id);app.queuePrompt=async()=>{throw Error('must not queue the workspace graph');};
const beforeCamera=JSON.stringify(ui.state.plan);await ui.openCameraDirecting();
const camera=ui.cameraWindow;assert.equal(camera.root.hidden,false);assert.equal(camera.root.topLayer,true);assert.equal(queued.length,0);
assert.equal(camera.root.querySelectorAll('video').length,0,'camera window contains no media viewer');assert.equal(camera.generate,undefined);assert.equal(camera.settings,undefined);assert.equal(camera.resultVideo,undefined);
assert.equal(ui.previewKind,'camera');assert.match(ui.video.src,/legacy.mp4/);assert.equal(JSON.stringify(ui.state.plan),beforeCamera);
const closeShot=camera.planCard.querySelectorAll('button').find(b=>b.dataset.cameraChoice==='shot'&&b.dataset.value==='close-up');await closeShot.onclick();assert.match(camera.state.widgets.camera_plan_json,/close-up/);assert.equal(queued.length,0);
assert.equal(MOVES.length,46);assert.equal(ANGLES.length,17);assert.equal(LENSES.length,8);
for(const value of ['360 orbit clockwise','360 orbit counterclockwise','hero cam','smooth orbit right']){
    assert.ok(!MOVES.some(item=>item.value===value));assert.equal(cameraGuide('movement',value),null);
}
for(const list of [SHOTS,ANGLES,MOVES,LENSES,FOCUS,EASINGS])assert.equal(new Set(list.map(item=>item.value)).size,list.length);
for(const move of MOVES){const prompt=cameraDirectionPrompt({shot:'medium shot',movement:move.value,speed:'moderate',strength:.4,start_frame:0,end_frame:120},120);assert.ok(prompt.includes(move.direction[0].toUpperCase()+move.direction.slice(1))||prompt.toLowerCase().includes(move.direction.toLowerCase()));assert.match(prompt,/Do not freeze, loop, reverse/);}
assert.equal(normalizeCameraSegment({shot:'rear view'}).angle,'rear view');assert.equal(normalizeCameraSegment({shot:'rear view'}).shot,'source framing');
const zoomPrompt=cameraDirectionPrompt({movement:'zoom in',strength:.5},120);assert.match(zoomPrompt,/optical center stationary/);assert.doesNotMatch(zoomPrompt,/Do not substitute.*digital crop/);
const dollyPrompt=cameraDirectionPrompt({movement:'dolly zoom in',strength:.5},120);assert.match(dollyPrompt,/forward while widening the lens/);assert.match(dollyPrompt,/Keep subject scale stable/);
const search=camera.planCard.querySelectorAll('input').find(input=>input.getAttribute('aria-label')==='카메라 무빙 검색');assert.ok(search);search.value='크레인';search.oninput();const shown=camera.planCard.querySelectorAll('[data-camera-choice="movement"]').filter(b=>!b.hidden);assert.equal(shown.length,3);
search.value='';search.oninput();camera.body.scrollTop=130;
for(const [key,value] of [['movement','dolly zoom in'],['angle','dutch angle'],['lens','85mm'],['focus','near to far'],['easing','ease in out']]){const button=camera.planCard.querySelectorAll('button').find(b=>b.dataset.cameraChoice===key&&b.dataset.value===value);assert.ok(button);await button.onclick();assert.equal(camera.body.scrollTop,130);}
const savedPart=JSON.parse(camera.state.widgets.camera_plan_json).segments[0];assert.equal(savedPart.angle,'dutch angle');assert.equal(savedPart.lens,'85mm');assert.equal(savedPart.focus,'near to far');
const cameraMode=ui.modeInputs.find(input=>input.value==='camera');assert.ok(cameraMode);cameraMode.checked=true;cameraMode.fire('change');assert.equal(ui.generationMode,'camera');
assert.ok(ui.controls.textContent.includes('카메라 생성 설정'));assert.ok(!camera.root.textContent.includes('모델·샘플링'));
ui.state.project_id='a'.repeat(32);ui.project.id=ui.state.project_id;
Object.assign(ui.state.plan.settings,{steps:12,width:768,height:1376,upscale:true,output_quality:93,sampler:'er_sde',scheduler:'sgm_uniform'});
camera.sourceVideo.readyState=1;camera.sourceVideo.duration=5;camera.state.planSource=camera.state.widgets.source_video;
const savedMovement=camera.segments[0].movement;
camera.segments[0].movement='hero cam';camera.writePlan();camera.renderPlan();
assert.match(camera.planCard.querySelector('[role="status"]').textContent,/제거된 모드/);
await assert.rejects(()=>ui.generate(),/제거된 모드/);assert.equal(queued.length,0,'removed saved mode must not reserve an SDK render');
assert.equal(camera.segments[0].movement,'hero cam','do not silently rewrite the saved plan');
camera.segments[0].movement=savedMovement;camera.writePlan();camera.renderPlan();
assert.equal(camera.state.camera_corrections,undefined);
assert.ok(!ui.controls.textContent.includes('SDK 카메라 교정'));
await assert.rejects(()=>ui.generate(),/LoadMoGeModel/);
assert.equal(queued.length,0,'missing correction dependencies fail before reserving a render');
camera.state.camera_corrections=false; // Old saved OFF values must not disable automatic correction.
cameraDependenciesAvailable=true;
await ui.generate();assert.equal(queued.length,1);assert.equal(ui.generateButton.disabled,true);assert.equal(ui.generateLabel.textContent,'생성 중…');
camera.sourceVideo.readyState=0;let metadataSettled=false;const metadataReady=camera.prepareSource().then(()=>{metadataSettled=true;});await Promise.resolve();assert.equal(metadataSettled,false);camera.sourceVideo.readyState=1;camera.sourceVideo.fire('loadedmetadata');await metadataReady;
const graph=queued[0].output,values=Object.values(graph),timeline=values.find(n=>n.class_type==='H3R2VCameraTimeline');
fs.writeFileSync(new URL('../runtime/camera_sdk_graph.json',import.meta.url),JSON.stringify(graph,null,2));
const firstCondition=values.find(n=>n.class_type==='MiniMaxH3ReferenceToVideo'&&graph[n.inputs['ref_videos.ref_video_0'][0]].inputs.segment_index===0);assert.match(firstCondition.inputs.prompt,/forward while widening the lens/);assert.match(firstCondition.inputs.prompt,/canted horizon/);assert.match(firstCondition.inputs.prompt,/85mm/);assert.match(firstCondition.inputs.prompt,/depth-aware optical pass/);
assert.ok(values.some(n=>n.class_type==='FlagshipDepthRackFocus'),'automatic correction ignores legacy OFF state');
assert.equal(timeline.inputs.steps,12);assert.equal(timeline.inputs.custom_width,768);assert.equal(timeline.inputs.custom_height,1376);assert.equal(timeline.inputs.lora_name,ui.state.plan.settings.turbo_lora);
const faceSamplers=new Set(values.filter(n=>n.class_type==='SamplerCustomAdvanced'&&graph[n.inputs.latent_image?.[0]]?.class_type==='LTXVConcatAVLatent').map(n=>n.inputs.sampler[0]));
assert.ok(faceSamplers.size>0,'strict camera synthesis includes guarded face-audio repair');
for(const [id,n] of Object.entries(graph))if(n.class_type==='KSamplerSelect')assert.equal(n.inputs.sampler_name,faceSamplers.has(id)?'res_multistep':'er_sde');
assert.ok(values.filter(n=>n.class_type==='BasicScheduler').every(n=>n.inputs.scheduler==='sgm_uniform'));
assert.ok(values.some(n=>n.class_type==='BasicScheduler'&&n.inputs.denoise===.35&&n.inputs.steps===8));
assert.equal(values.find(n=>n.class_type==='RTXVideoVSRRestore').inputs.output_quality,93);
assert.ok(values.find(n=>n.class_type==='SaveVideo').inputs.filename_prefix.startsWith('EndlessH3AIO/'+ui.state.project_id));
assert.equal(values.find(n=>n.class_type==='CLIPLoader').inputs.clip_name,ui.state.plan.settings.clip);
assert.ok(!values.some(n=>n.class_type==='SpectrumApplyMiniMaxH3'));
api.fire('executed',{prompt_id:'other-work',node:camera.state.finalNodeId,output:{videos:[{filename:'wrong.mp4',type:'output'}]}});assert.equal(camera.state.results.length,0);
api.fire('executed',{prompt_id:'camera-own',node:'segment',output:{h3_camera_preview:[{filename:'part.mp4',type:'temp',subfolder:'segments'}]}});assert.match(ui.video.src,/part.mp4/);assert.equal(camera.state.results.length,0,'intermediate previews do not enter final gallery');
api.fire('executed',{prompt_id:'camera-own',node:camera.state.finalNodeId,output:{videos:[{filename:'camera-ok.mp4',subfolder:'EndlessH3AIO/'+ui.state.project_id+'/camera',type:'output'}]}});
api.fire('execution_success',{prompt_id:'camera-own'});assert.equal(camera.state.results.length,1);assert.equal(ui.generateButton.disabled,false);assert.match(ui.video.src,/camera-ok.mp4/);assert.ok(ui.galleryItems().some(item=>item.kind==='camera'));assert.ok(ui.galleryList.textContent.includes('카메라 디렉팅 1'));
const finished=camera.state.results[0].finished;camera.outputs({videos:[camera.state.lastOutput]});assert.equal(camera.state.results.length,1);assert.equal(camera.state.results[0].finished,finished);
const key=ui.cameraItems()[0].key;await ui.outputAction('favorite',[key]);assert.equal(camera.state.results[0].favorite,true);await ui.outputAction('trash',[key]);assert.equal(camera.state.results[0].gallery_deleted,true);await ui.outputAction('restore',[key]);assert.equal(camera.state.results[0].gallery_deleted,false);
cameraQueue={queue_running:[],queue_pending:[[1,'other-work'],[2,'camera-own']]};await camera.cancel();assert.deepEqual(deleted,[]);assert.deepEqual(sdkCancelled,['camera-own']);assert.equal(interrupted.length,0);
cameraQueue={queue_running:[[1,'other-work']],queue_pending:[]};await camera.cancel();assert.equal(interrupted.length,0);
cameraQueue={queue_running:[[1,'camera-own']],queue_pending:[]};camera.running=true;await ui.cancelButton.events.click[0]();assert.deepEqual(interrupted,[]);assert.deepEqual(sdkCancelled,['camera-own','camera-own','camera-own']);
const left=parseFloat(camera.root.style.left);camera.header.firstChild.fire('keydown',{key:'ArrowRight'});assert.equal(parseFloat(camera.root.style.left),left+20);
camera.close();await ui.openCameraDirecting();assert.equal(queued.length,1);assert.equal(camera.root.hidden,false);
const spectrumSettings={...ui.state.plan.settings,cache_mode:'spectrum',spectrum_blend:.35};
const spectrumGraph=applyCameraSettings(structuredClone(graph),spectrumSettings,{strict:false});assert.ok(Object.values(spectrumGraph).some(n=>n.class_type==='SpectrumApplyMiniMaxH3'&&n.inputs.history_storage==='system_ram'&&n.inputs.audio_blend_weight===0));
const commonInput=cameraTimelineInputs({...camera.state.widgets,sage_enabled:true,spectrum_enabled:true,upscale_quality:'High'},ui.state.plan.settings);assert.equal(commonInput.sage_enabled,false);assert.equal(commonInput.spectrum_enabled,false);assert.equal(commonInput.upscale_quality,'Ultra');
const queueCalls=[];const nativeQueue=ui.queue;ui.queue=async action=>queueCalls.push(action);ui.generationMode='clip';await ui.generate();assert.deepEqual(queueCalls,['retry']);ui.queue=nativeQueue;
// Exercise actual delegated UI events and drawing for every catalog control.
const guide=camera.motionGuide,queueCount=queued.length,planBeforeGuide=JSON.stringify(camera.state.widgets);
const guideButtons=camera.planCard.querySelectorAll('[data-camera-choice]');
assert.equal(guideButtons.length,99);
assert.ok(guide.root.parentElement===camera.guideHost,'3D guide stays in the right column');
for(const button of guideButtons){
    const k=button.dataset.cameraChoice,v=k==='strength'?button.value:button.dataset.value;
    if(k!=='strength'){
        const icon=button.querySelector('.eh3-camera-choice-icon'),name=button.querySelector('.eh3-camera-choice-name');
        assert.ok(icon?.innerHTML.startsWith('<svg'));assert.equal(icon.getAttribute('aria-hidden'),'true');assert.ok(name?.textContent);assert.equal(button.querySelector('small'),null);assert.ok(button.getAttribute('aria-label').includes(v));
    }
    const info=cameraGuide(k,v);assert.ok(info?.description&&/[가-힣]/.test(info.description),`${k}: ${v} must explain in Korean`);
    for(const t of [0,.2,.5,.81,1]){
        const state=cameraDemoState(k,v,t);
        for(const field of [state.position,state.target,state.actor])assert.ok(Object.values(field).every(Number.isFinite));
        const point=projectDemoPoint({x:.3,y:1.5,z:-2},state);if(point)assert.ok(Object.values(point).every(Number.isFinite));
    }
    camera.root.fire('focusin',{target:button});assert.equal(guide.target,button);assert.equal(guide.root.hidden,false);assert.match(guide.description.textContent,/[가-힣]/);
    const callback=frames[guide.frame-1];callback(performance.now()+2300);
    camera.root.fire('focusout',{target:button});assert.equal(guide.root.hidden,false);assert.equal(guide.frame,undefined);assert.equal(button.getAttribute('aria-describedby'),null);
}
const sample=guideButtons.find(b=>b.dataset.value==='zoom in');
sample.setAttribute('aria-describedby','existing-help');
camera.root.fire('pointerover',{target:sample,relatedTarget:null});assert.ok(guide.timer);assert.equal(guide.root.hidden,false);
await new Promise(resolve=>setTimeout(resolve,200));assert.equal(guide.target,sample);assert.equal(sample.getAttribute('aria-describedby'),'existing-help '+guide.root.id);
camera.root.fire('pointerout',{target:sample,relatedTarget:sample.firstChild});assert.equal(guide.target,sample,'moving inside same button must not restart');
camera.root.fire('pointerout',{target:sample,relatedTarget:null});assert.equal(guide.target,null);assert.equal(sample.getAttribute('aria-describedby'),'existing-help');
camera.root.fire('pointerover',{target:sample,relatedTarget:null});camera.root.fire('scroll');await new Promise(resolve=>setTimeout(resolve,200));assert.equal(guide.target,null,'scroll cancels delayed popup');
guide.show(sample);let stopped=false;camera.root.fire('keydown',{key:'Escape',stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,true);assert.equal(guide.target,null);
guide.show(sample);document.hidden=true;document.dispatchEvent({type:'visibilitychange'});assert.equal(guide.frame,undefined);document.hidden=false;
guide.motion={matches:true};guide.show(sample);assert.equal(guide.frame,undefined,'reduced motion is a still schematic');guide.motion=null;
guide.motion={matches:true};const cameraTimes=[],drawCamera=guide.draw.bind(guide);guide.draw=(key,value,time)=>{cameraTimes.push(time);drawCamera(key,value,time);};
camera.root.fire('pointerover',{target:sample,relatedTarget:null});await new Promise(resolve=>setTimeout(resolve,150));
assert.equal(guide.fromPointer,true);assert.notEqual(guide.frame,undefined,'explicit camera hover animates with reduced motion enabled');
for(const elapsed of [100,1400,5300,6700,10400]){frames[guide.frame-1](guide.started+elapsed);assert.ok(Math.abs(cameraTimes.at(-1)-(elapsed%5000)/5000)<1e-8);}
guide.motionChanged();assert.notEqual(guide.frame,undefined,'preference changes must not freeze active hover');
camera.root.fire('pointerout',{target:sample,relatedTarget:null});assert.equal(guide.frame,undefined);guide.draw=drawCamera;guide.motion=null;
const strengthControl=guideButtons.find(b=>b.dataset.cameraChoice==='strength');guide.show(strengthControl);strengthControl.value='.85';camera.root.fire('input',{target:strengthControl});assert.match(guide.heading.textContent,/0.85/);
guide.show(sample);camera.renderPlan();assert.equal(guide.target,null,'rerender discards tooltip tied to removed controls');
guide.show(camera.planCard.querySelectorAll('button').find(b=>b.dataset.value==='zoom in'));camera.close();assert.equal(guide.frame,undefined);assert.equal(guide.root.hidden,false);camera.root.hidden=false;
assert.equal(queued.length,queueCount,'hover must never queue generation');assert.equal(JSON.stringify(camera.state.widgets),planBeforeGuide,'hover must not edit model or segment settings');
const base=cameraDemoState('movement','static camera',0),same=cameraDemoState('movement','static camera',1);assert.deepEqual(base.position,same.position);assert.equal(base.focal,same.focal);
const zoom=cameraDemoState('movement','zoom in',.82),dolly=cameraDemoState('movement','slow dolly in',.82);assert.deepEqual(zoom.position,base.position);assert.equal(dolly.focal,base.focal);assert.ok(dolly.position.z<base.position.z);
const size=s=>Math.abs(projectDemoPoint({x:0,y:1.8,z:0},s).y-projectDemoPoint({x:0,y:.2,z:0},s).y);
for(const v of ['dolly zoom in','dolly zoom out'])assert.ok(Math.abs(size(cameraDemoState('movement',v,0))-size(cameraDemoState('movement',v,1)))<.001,'dolly zoom keeps subject scale within 0.1% of screen height');
const orbit=cameraDemoState('movement','smooth orbit left',.5);assert.ok(orbit.position.x<0);assert.ok(orbit.position.z<base.position.z);
assert.deepEqual(cameraDemoState('strength','0',1).position,base.position);
assert.ok(size(zoom)>size(base),'optical zoom visibly enlarges subject');
assert.ok(cameraDemoState('speed','very fast',.15).position.z<cameraDemoState('speed','very slow',.15).position.z);
assert.equal(cameraGuide('unknown','unknown'),null);
guide.show(camera.planCard.querySelectorAll('button').find(b=>b.dataset.value==='zoom in'));
console.log('PASS: 99 retained hover guides; removed presets absent and saved plans rejected before queue; Korean explanations, animation lifecycle and retained geometry.');

assert.equal(camera.planCard.querySelector('.eh3-desk-tabs').children.length,5);
assert.ok(camera.planCard.querySelector('.eh3-desk-timeline'));
assert.ok(camera.planCard.querySelector('.eh3-desk-shelf').contains(camera.guideHost));
for(const key of ['shot','angle','movement','lens','focus','speed','easing']){
    camera.activateChoice(key);const visible=camera.planCard.querySelectorAll('[data-choice-panel]').filter(p=>!p.hidden);
    assert.equal(visible.length,1);assert.equal(visible[0].dataset.choicePanel,key);assert.equal(camera.planCard.querySelectorAll('[data-choice-tab]').filter(b=>b.classList.contains('selected')).length,1);
}
camera.activateChoice('movement');let motionPanel=camera.planCard.querySelector('[data-choice-panel="movement"]');
let cameraSearch=motionPanel.querySelectorAll('input').find(input=>input.type==='search');cameraSearch.value='orbit';cameraSearch.oninput();
const visibleChoices=()=>motionPanel.querySelectorAll('.eh3-camera-option-group').filter(g=>!g.hidden).flatMap(g=>g.querySelectorAll('[data-camera-choice]').filter(b=>!b.hidden));
assert.equal(visibleChoices().length,1,'English orbit search shows the retained left orbit only');
cameraSearch.value='';cameraSearch.oninput();await motionPanel.querySelector('.eh3-desk-categories').querySelectorAll('button').find(b=>b.textContent==='줌').onclick();
assert.equal(visibleChoices().length,MOVES.filter(m=>m.group==='줌').length);
const savedInlineGuide=guide.root,savedOtherSegments=JSON.stringify(camera.segments.filter((_,i)=>i!==camera.selected));
await visibleChoices().find(b=>b.dataset.value==='zoom in').onclick();assert.equal(camera.segments[camera.selected].movement,'zoom in');assert.equal(JSON.stringify(camera.segments.filter((_,i)=>i!==camera.selected)),savedOtherSegments);
assert.ok(guide.root===savedInlineGuide&&guide.root.parentElement===camera.guideHost,'selection reuses inline canvas and renderer');assert.equal(guide.frame,undefined,'idle guide must not keep animating after a selection');
console.log('PASS: Director Desk timeline, five primary tabs and two advanced tabs, English search across categories, category filters, exact segment selection and persistent inline 3D guide.');
camera.dispose();assert.equal(guide.root.parentElement,null);assert.equal(guide.frame,undefined);console.log('PASS: camera window only edits shots; main settings build actual camera graph; shared Generate/Stop, progress/segment previews/final viewer/gallery, favorites/trash, original project plan untouched by opening.');
console.log('PASS: actual studio rendering, modes, 3-panel retention, docking/maximize/reset, manual ratio persistence and generation status.');

const plan={sequence_mode:false,clips:[{mode:'R2V'}],settings:{}};
const record={index:1,job:'old',video:'old.mp4',created:10};
let project={clips:{'1':record},jobs:{},active:null};
const panel=new PreviewNodes(new Element('div'),()=>{},null,p=>'/view/'+p);
panel.draw(previewNodeModel(plan,project,0),{previewJob:'old',previewText:'',busy:false});
panel.list.querySelector('button').fire('pointerenter');assert.equal(panel.hover.hidden,false);assert.equal(panel.hoverVideo.src,'/view/old.mp4');
panel.list.querySelector('button').fire('pointerleave');assert.equal(panel.hover.hidden,true);assert.equal(panel.hoverVideo.src,'');
project.jobs.bad={id:'bad',index:1,action:'retry',state:'failed',created:20};
panel.draw(previewNodeModel(plan,project,0),{previewText:'',busy:false});
const failed=panel.list.querySelector('.failed');assert.match(failed.textContent,/실패/);assert.equal(failed.querySelector('img'),null);failed.fire('pointerenter');assert.equal(panel.hover.hidden,true);
project.active='working';project.jobs.working={id:'working',index:1,action:'retry',state:'running',prompt_id:'p1'};
panel.draw(previewNodeModel(plan,project,0),{previewText:'',busy:false});
const image=panel.list.querySelector('.eh3-node-live').querySelector('img');assert.equal(image.hidden,true);
const live=new StudioLivePreview(api,()=>project.jobs[project.active],f=>panel.setLivePreview(f));
const blob=new Blob(['preview'],{type:'image/jpeg'});
api.fire('execution_start',{prompt_id:'other'});api.fire('b_preview',blob);assert.equal(live.current(),null);
api.fire('b_preview_with_metadata',{blob,jobId:'p1'});const frame=live.current();assert.ok(frame);assert.equal(image.hidden,false);
api.fire('b_preview',blob);assert.equal(live.current().url,frame.url,'metadata and legacy events must not duplicate');
api.fire('execution_error',{prompt_id:'p1'});assert.equal(live.current(),null);assert.equal(image.hidden,true);
live.dispose();panel.dispose();assert.ok([...api.listeners.values()].every(s=>!s.size));
console.log('PASS: completed hover, failure without image, correlated live preview, duplicate filtering and listener cleanup.');

const actionUi=studio('R2V'),actionGuide=actionUi.actionPreview,draws=[];
assert.equal(actionGuide.root,undefined,'main button assistant must be lazy');
assert.equal(studioActionFor(actionUi.generateButton),'generate');
assert.equal(studioActionFor(actionUi.scheduleButton),'schedule');
assert.equal(studioActionFor(actionUi.cancelButton),'stop');
assert.equal(studioActionFor(actionUi.outputUpscaleButton),'upscale');
assert.equal(studioActionFor(actionUi.mergeButton),'merge');
assert.equal(studioActionFor(actionUi.cameraButton),'camera');
assert.equal(studioActionFor(actionUi.settingsButton),'settings');
actionGuide.create();assert.equal(actionGuide.unavailable.hidden,false,'missing WebGL keeps readable text');
actionGuide.renderer={draw:(...args)=>draws.push(args),dispose(){this.disposed=true;}};
const actionQueue=queued.length,actionState=JSON.stringify(actionUi.state),actionProperties=JSON.stringify(actionUi.node.properties);
const start=actionUi.generateButton;start.setAttribute('aria-describedby','existing');
start.setAttribute('title','Generate description');
actionUi.root.fire('pointerover',{target:start,relatedTarget:null});assert.ok(actionGuide.timer);assert.equal(actionGuide.root.hidden,true);
await new Promise(resolve=>setTimeout(resolve,320));assert.equal(actionGuide.target,start);assert.equal(actionGuide.root.hidden,false);assert.equal(draws.at(-1)[0],'generate');
frames[actionGuide.frame-1](performance.now()+900);assert.ok(draws.at(-1)[1]>0);
actionUi.root.fire('pointerout',{target:start,relatedTarget:start.firstChild});assert.equal(actionGuide.target,start);
actionUi.root.fire('pointerout',{target:start,relatedTarget:null});assert.equal(actionGuide.root.hidden,true);assert.equal(start.getAttribute('aria-describedby'),'existing');assert.equal(start.getAttribute('title'),'Generate description');
actionGuide.show(start);start.setAttribute('title','Updated while hovering');actionGuide.hide();assert.equal(start.getAttribute('title'),'Updated while hovering');
for(const button of [actionUi.mergeButton,actionUi.outputUpscaleButton,actionUi.scheduleButton,actionUi.cancelButton,actionUi.cameraButton,actionUi.settingsButton,actionUi.vramResetButton,actionUi.saveButton,actionUi.addButton,actionUi.favoriteButton,actionUi.deleteButton]){
    actionUi.root.fire('focusin',{target:button});assert.equal(actionGuide.target,button);assert.equal(draws.at(-1)[0],studioActionFor(button));
    actionUi.root.fire('focusout',{target:button});assert.equal(actionGuide.frame,undefined);
}
actionGuide.motion={matches:true};actionGuide.show(start);assert.equal(actionGuide.frame,undefined);assert.equal(draws.at(-1)[1],.5);actionGuide.motion=null;
actionGuide.motion={matches:true};actionUi.root.fire('pointerover',{target:start,relatedTarget:null});await new Promise(resolve=>setTimeout(resolve,150));
assert.equal(actionGuide.fromPointer,true);assert.notEqual(actionGuide.frame,undefined,'main UI hover must play despite system reduced-motion preference');
for(const elapsed of [100,900,3700,4500,8000]){frames[actionGuide.frame-1](actionGuide.started+elapsed);assert.ok(Math.abs(draws.at(-1)[1]-(elapsed%3600)/3600)<1e-8);}
actionGuide.motionChanged();assert.notEqual(actionGuide.frame,undefined);actionUi.root.fire('pointerout',{target:start,relatedTarget:null});assert.equal(actionGuide.frame,undefined);actionGuide.motion=null;
actionGuide.show(start);actionUi.root.fire('scroll');assert.equal(actionGuide.target,null);
actionGuide.show(start);actionUi.root.fire('keydown',{key:'Escape'});assert.equal(actionGuide.target,null);
actionGuide.show(start);document.hidden=true;document.dispatchEvent({type:'visibilitychange'});assert.equal(actionGuide.target,null);document.hidden=false;
assert.equal(queued.length,actionQueue,'hover must not queue or execute buttons');assert.equal(JSON.stringify(actionUi.state),actionState);assert.equal(JSON.stringify(actionUi.node.properties),actionProperties);
actionGuide.show(start);actionUi.render();assert.equal(actionGuide.target,null);assert.equal(actionUi.actionPreview,actionGuide,'rerender reuses one delegated controller');
const oldRoot=actionGuide.root,oldRenderer=actionGuide.renderer;actionUi.dispose();assert.equal(actionGuide.frame,undefined);assert.equal(oldRoot.parentElement,null);assert.equal(oldRenderer.disposed,true);
console.log('PASS: main button function mapping, real DOM delegation, delayed hover, animation ticks, accessible text fallback, no queue/settings mutation, keyboard/reduced-motion/scroll/visibility/rerender/dispose cleanup.');
