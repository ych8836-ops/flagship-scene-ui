# Korean / English interface

Use **한국어 / English** in the studio's top header. The choice applies immediately to the studio, the open camera editor and hover guides. It is saved under `flagship_scene_ui_language` in this origin's browser storage. First visit: Korean for a Korean browser, English for other browser languages. If storage is unavailable, the switch still works for the open page. ComfyUI's own locale and the original Comfy installation are unchanged.

After updating an already open SDK installation, hard-refresh its page (Ctrl+F5). No model reload or job submission is required to switch language. Different loopback ports are different browser origins and keep independent preferences.

## Scope

Translated: studio buttons, reference-input instructions, scene/clip controls, settings, optimizer/upscale labels, gallery tools, camera tabs/choices/numeric-angle controls, hover explanations, accessibility labels, progress and known application errors. Translation is offline; no translation API, model inference or reference upload is performed.

Retained as entered: project/scene names, prompts, dialogue, author notes, filenames/paths, model/LoRA names, seeds, canonical enum values, reference tags, saved generation graphs and camera plans. Localized date formatting is display-only. The language switch does not translate the requested output language or alter speech/voice style.

Unknown third-party error details and raw low-level node/engine interfaces remain as supplied by their authors. Large raw diagnostic messages are left intact. This is a bilingual studio interface, not arbitrary document translation or automatic localization of every installed Comfy extension.

## Implementation

`web/i18n_messages.js` and `web/i18n_errors.js` contain source/English messages and opaque interpolation-slot metadata. `web/i18n.js` owns language preference and scoped display updates. It changes text-node data and UI attributes inside registered studio/portal roots. It never traverses input/textarea values or modifies project objects. Model/file selectors retain their explicit option values.

User-bearing labels use explicit message bindings or protected text parts; scene names that happen to match words such as “삭제” are not interpreted as commands to translate. Language changes do not rebuild input controls, stop video playback, close dialogs or reset scrolling. Detached popovers and disposed studios release their observers/listeners. The hover-action classifier uses canonical UI labels so the same animations remain reachable in both languages.

## Tests / contributing a phrase

```powershell
python tools/install_dependencies.py --features ui
npm ci
node tests/test_i18n.mjs
```

The test renders the actual studio and camera components in jsdom, checks both languages and hover text, preserves controls/input/plan state, verifies zero requests and checks message coverage/interpolation slots. WebGL is intentionally unavailable; inspect real graphics separately.

When adding UI copy, add a message pair and retain all interpolation placeholders. Treat filenames, user names, prompts and notes as opaque values. Use an explicit `bindUI`/`formatUI` label when combining user data and UI text; do not apply global word replacement or translate model-facing keys. Then run `npm test`.

## 한국어

상단의 **한국어 / English**를 누르면 열린 카메라 창과 도움말까지 즉시 바뀝니다. 문구만 바꾸며 입력 중인 프롬프트·대사·프로젝트/씬 이름·참고 파일·LoRA·모델·생성 값은 유지합니다. 영상 재생 위치와 패널 스크롤도 유지합니다. 사용자 선택은 브라우저에 저장되며 원본 Comfy 설정을 수정하지 않습니다.
