import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {parse} from 'acorn';
import * as i18n from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/i18n.js';
import {UI_MESSAGES} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/i18n_messages.js';
import {UI_ERRORS} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/i18n_errors.js';
import {StudioCameraWindow} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_window.js';
import {StudioDockLayout} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio_layout.js';
import {StudioActionPreview, studioActionFor} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/studio_action_preview.js';
import {StudioLivePreview} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/live_preview.js';
import {PreviewNodes, previewNodeModel, nodeLocation} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/preview_nodes.js';
import {normalizeCameraSegment} from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/camera_controls.js';
import * as sequence from '../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/sequence.js';

const {window} = new JSDOM('<!doctype html><body></body>', {url:'http://localhost/',pretendToBeVisual:true});
globalThis.window=window;globalThis.document=window.document;
Object.defineProperty(globalThis,'localStorage',{value:window.localStorage,configurable:true});
globalThis.IntersectionObserver=class {observe(){}disconnect(){}};
globalThis.ResizeObserver=class {observe(){}disconnect(){}};
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
window.HTMLMediaElement.prototype.pause=function(){};window.HTMLMediaElement.prototype.load=function(){};
window.HTMLMediaElement.prototype.play=async function(){};
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
window.HTMLElement.prototype.showPopover=function(){this._popoverOpen=true;};
window.HTMLElement.prototype.hidePopover=function(){this._popoverOpen=false;};
const matches=window.HTMLElement.prototype.matches;
window.HTMLElement.prototype.matches=function(selector){return selector===':popover-open'?!!this._popoverOpen:matches.call(this,selector);};
window.HTMLCanvasElement.prototype.getContext=function(type){return type==='2d'?new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)}):null;};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const folder=new URL('../custom_nodes/ComfyUI-Endless-H3-AllInOne/web/',import.meta.url);
const config=JSON.parse(fs.readFileSync(new URL('fixtures/config_test.json',import.meta.url),'utf8'));
let network=0;
const api={apiURL:p=>p,addEventListener(){},removeEventListener(){},fetchApi(){network++;throw Error('Language switching must not make a request');}};
const app={registerExtension(){},graph:{setDirtyCanvas(){}},canvas:{setDirty(){}}};
const context=vm.createContext({document,window,app,api,...i18n,...sequence,
    StudioSDKEvents:class{},StudioCameraWindow,StudioDockLayout,StudioActionPreview,StudioLivePreview,PreviewNodes,previewNodeModel,nodeLocation,
    URL,URLSearchParams,Event:window.Event,File:window.File,Blob:window.Blob,localStorage:window.localStorage,
    IntersectionObserver,ResizeObserver,requestAnimationFrame,cancelAnimationFrame,console,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){}});
const source=fs.readFileSync(new URL('studio.js',folder),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('studio.js',folder).href));
new vm.Script(source+'\nglobalThis.Studio=EndlessStudio;').runInContext(context);
i18n.setUILanguage('ko',{persist:false});
const ui=Object.create(context.Studio.prototype);
Object.assign(ui,{node:{id:7,properties:{},setDirtyCanvas(){}},widget:{value:'{}'},sdkEvents:{watch(){},sync(){},dispose(){}},config:structuredClone(config),
    state:{name:'삭제 · 원본',plan:structuredClone(config.default_plan)},selected:0,selectedClips:new Set([0]),galleryProjects:new Map(),outputSelection:new Set(),galleryScope:'all',generationMode:'clip',previewKind:'clip',
    root:document.createElement('div'),busyRequest:false,dirty:false,project:null});
ui.root.className='eh3-studio';document.body.append(ui.root);
ui.state.plan.settings.loras=[{name:'삭제.safetensors',strength:1.5}];ui.config.models.loras.push('삭제.safetensors');
ui.state.plan.sequence_mode=true;ui.state.plan.scenes=[{id:'a',name:'삭제 · 원본',prompt:'배경은 그대로',references:{images:['원본.png'],videos:[{name:'삭제.mp4',use_audio:false}],audios:[]}}];
ui.config.images=['원본.png'];ui.state.plan.clips[0].scene_id='a';ui.state.plan.clips[0].mode='R2V';
ui.state.plan.clips[0].prompt='@picture_1 <d>[Korean] 좋은 아침이야! 삭제하지 마.</d>';ui.state.plan.clips[0].use_common_references=true;
ui.render();
await tick();
const prompt=ui.root.querySelector('textarea[aria-label="이 클립의 프롬프트"]');assert.ok(prompt);
prompt.focus();prompt.setSelectionRange(3,9);ui.controls.scrollTop=143;ui.galleryList.scrollLeft=71;ui.video.currentTime=2.75;
const plan=JSON.stringify(ui.state.plan),widget=ui.widget.value,properties=JSON.stringify(ui.node.properties);
const selectValues=[...ui.root.querySelectorAll('select')].map(select=>[select,select.value]);
const beforeElements=[...ui.root.querySelectorAll('input,textarea,select,video')];
ui.root.querySelector('[data-ui-language="en"]').click();await tick();
assert.equal(ui.root.lang,'en');assert.equal(window.localStorage.getItem(i18n.UI_LANGUAGE_KEY),'en');
assert.ok(ui.root.textContent.includes('Generate all + assemble'));assert.ok(ui.root.textContent.includes('Optimizers'));
assert.ok(ui.root.textContent.includes('Lipsync audio · Project-wide'));assert.ok(ui.root.textContent.includes('Upscale selected video'));
assert.equal(document.activeElement,prompt);assert.equal(prompt.selectionStart,3);assert.equal(prompt.selectionEnd,9);
assert.equal(prompt.value,'@picture_1 <d>[Korean] 좋은 아침이야! 삭제하지 마.</d>');
assert.equal(ui.controls.scrollTop,143);assert.equal(ui.galleryList.scrollLeft,71);assert.equal(ui.video.currentTime,2.75);
assert.deepEqual([...ui.root.querySelectorAll('input,textarea,select,video')],beforeElements);
assert.equal(JSON.stringify(ui.state.plan),plan);assert.equal(ui.widget.value,widget);assert.equal(JSON.stringify(ui.node.properties),properties);
for(const [select,value] of selectValues)assert.equal(select.value,value);
assert.ok(ui.root.textContent.includes('삭제.safetensors'));assert.ok(ui.root.querySelector('.eh3-scene-button').textContent.includes('삭제 · 원본'));
assert.equal(ui.root.querySelector('[data-ui-language="en"]').getAttribute('aria-pressed'),'true');
assert.equal(studioActionFor(ui.outputUpscaleButton),'upscale');assert.equal(studioActionFor(ui.settingsButton),'settings');
ui.notice('클립 2의 프롬프트가 비어 있습니다.');await tick();assert.equal(ui.status.textContent,'The prompt for clip 2 is empty.');
ui.notice('참고 파일에 비디오가 없습니다: 삭제.mp4');await tick();assert.equal(ui.status.textContent,'The reference file contains no video: 삭제.mp4');
assert.equal(network,0);
console.log('PASS: real studio KO→EN keeps DOM identity, form values, prompt/dialogue, filenames, plan/widget/properties, focus/selection, scroll and video position; zero requests.');

const camera=new StudioCameraWindow(ui,api);ui.cameraWindow=camera;camera.schema={input:{required:{},optional:{}}};
camera.segments=[normalizeCameraSegment({start_frame:0,end_frame:124,shot:'medium shot',angle:'eye level',movement:'slow dolly in',strength:.35})];camera.state.widgets.camera_plan_json=JSON.stringify({segments:camera.segments});
camera.root.hidden=false;camera.setReferences(['삭제.mp4']);camera.renderPlan();await tick();
assert.equal(camera.root.lang,'en');assert.ok(camera.root.textContent.includes('Camera direction'));assert.ok(camera.root.textContent.includes('Camera movement'));
assert.ok(camera.root.textContent.includes('Dolly in'));assert.equal(camera.sourceSelect.options[1].textContent,'삭제.mp4');
const segments=JSON.stringify(camera.segments),cameraState=JSON.stringify(camera.state.widgets);
const cameraChoice=camera.root.querySelector('[data-camera-choice="movement"][data-value="slow dolly in"]');assert.ok(cameraChoice);
camera.motionGuide.show(cameraChoice,true);await tick();
assert.equal(camera.motionGuide.heading.textContent,'Dolly in');
assert.match(camera.motionGuide.description.textContent,/Move toward the subject/);
ui.actionPreview.show(ui.outputUpscaleButton,true);await tick();
assert.match(ui.actionPreview.root.textContent,/This control is currently unavailable/);
assert.match(ui.actionPreview.root.textContent,/Click or check one full assembly in the gallery/);
const untranslated=[];
for(const root of [ui.root,camera.root,ui.actionPreview.root]){
    const walker=document.createTreeWalker(root,window.NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode()){
        const parent=node.parentElement;
        if(parent.closest('[data-ui-raw="true"],[data-ui-raw="text"],.eh3-gallery-project,.eh3-reference-name,input,textarea,style,script,code,pre'))continue;
        if(/[가-힣]/.test(node.nodeValue.replaceAll(ui.state.plan.scenes[0].name,'')))untranslated.push(node.nodeValue);
    }
}
assert.deepEqual([...new Set(untranslated)],[],'Untranslated UI chrome (user data is excluded)');
const galleryName=document.createElement('span');galleryName.className='eh3-gallery-project';galleryName.textContent='삭제';ui.root.append(galleryName);
ui.root.querySelector('[data-ui-language="ko"]').click();await tick();
assert.equal(ui.root.lang,'ko');assert.equal(camera.root.lang,'ko');assert.ok(ui.root.textContent.includes('전체 생성+합치기'));assert.equal(galleryName.textContent,'삭제');
assert.equal(JSON.stringify(ui.state.plan),plan);assert.equal(JSON.stringify(camera.segments),segments);assert.equal(JSON.stringify(camera.state.widgets),cameraState);
assert.equal(camera.root.querySelector('[data-camera-choice="movement"][data-value="slow dolly in"]'),cameraChoice);
assert.ok(cameraChoice.textContent.includes('돌리 인'));assert.equal(network,0);
assert.equal(camera.motionGuide.heading.textContent,'돌리 인');
console.log('PASS: camera tabs, numeric angles and hover-guide DOM follow language changes without replacing controls or changing camera plan values.');

const stored={getItem:()=> 'en'};assert.equal(i18n.preferredUILanguage(stored,'ko-KR'),'en');assert.equal(i18n.preferredUILanguage(null,'en-GB'),'en');assert.equal(i18n.preferredUILanguage(null,'ko-KR'),'ko');
const broken={getItem(){throw Error('blocked');}};assert.equal(i18n.preferredUILanguage(broken,'en-US'),'en');
for(const [ko,en]of [...UI_MESSAGES,...UI_ERRORS])assert.deepEqual([...ko.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),[...en.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort());
const catalog=new Set(UI_MESSAGES.map(r=>r[0]));
for(const filename of ['studio.js','camera_controls.js','camera_motion_preview.js','camera_window.js','multiangle_editor.js','multiangle_math.js','preview_nodes.js','sequence.js','studio_layout.js','studio_action_preview.js']){
    const code=fs.readFileSync(new URL(filename,folder),'utf8');
    function walk(node){if(!node||typeof node!=='object')return;let key;
        if(node.type==='Literal'&&typeof node.value==='string')key=node.value;
        if(node.type==='TemplateLiteral')key=node.quasis.map((q,i)=>q.value.cooked+(i<node.expressions.length?`{${i}}`:'' )).join('');
        if(key&&/[가-힣]/.test(key)&&!['한국어'].includes(key))assert.ok(catalog.has(key),`Missing catalog entry in ${filename}: ${key}`);
        for(const [k,value]of Object.entries(node)){if(k==='quasis')continue;if(Array.isArray(value))value.forEach(walk);else if(value?.type)walk(value);}}
    walk(parse(code,{ecmaVersion:'latest',sourceType:'module'}));
}
ui.dispose();const detached=document.createElement('span');detached.textContent='저장';ui.root.append(detached);i18n.setUILanguage('en',{persist:false});await tick();assert.equal(detached.textContent,'저장');
console.log('PASS: language preference/browser defaults, interpolation slots, source-message coverage and observer cleanup.');
window.close();
