import {UI_MESSAGES} from './i18n_messages.js';
import {UI_ERRORS} from './i18n_errors.js';

// UI-only localization. Never walk input values, model graphs or project objects.
export const UI_LANGUAGE_KEY = 'flagship_scene_ui_language';
export function preferredUILanguage(storage, browserLanguage = 'ko') {
    let saved; try { saved = storage?.getItem(UI_LANGUAGE_KEY); } catch {}
    return ['ko', 'en'].includes(saved) ? saved : /^ko(?:-|$)/i.test(browserLanguage) ? 'ko' : 'en';
}
let initialBrowserLanguage = 'ko', initialStorage;
try { initialBrowserLanguage = globalThis.window?.navigator?.language || 'ko'; } catch {}
try { initialStorage = globalThis.window?.localStorage; } catch {}
let language = preferredUILanguage(initialStorage, initialBrowserLanguage);
const listeners = new Set();
export const getUILanguage = () => language;
export const getUILocale = () => language === 'ko' ? 'ko-KR' : 'en-US';
export function setUILanguage(value, {persist = true} = {}) {
    if (!['ko', 'en'].includes(value)) throw new Error('Unsupported UI language');
    if (persist) { try { globalThis.window?.localStorage?.setItem(UI_LANGUAGE_KEY, value); } catch {} }
    if (language === value) return;
    language = value;
    for (const listener of [...listeners]) listener(value);
}
export function onUILanguageChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }

const messages = [...UI_MESSAGES, ...UI_ERRORS];
const rows = [...messages];
for (const row of messages) {
    const source = row[0].replace(/^[\s·]+|[\s·]+$/g, ''), target = row[1].replace(/^[\s·]+|[\s·]+$/g, '');
    if (source && source !== row[0] && !rows.some(other => other[0] === source)) rows.push([source, target, row[2]]);
}
const ko = new Map(rows.map(row => [row[0], row]));
const en = new Map(rows.map(row => [row[1], row]));
export function formatUI(key, ...values) {
    const row = ko.get(key) || en.get(key);
    return (row ? row[language === 'ko' ? 0 : 1] : key).replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
}
const bindings = new WeakMap();
export function bindUI(node, attribute, render) {
    let records = bindings.get(node); if (!records) bindings.set(node, records = new Map());
    records.set(attribute, render);
    const value = render();
    if (attribute === 'textContent') { if (node.textContent !== value) node.textContent = value; }
    else node.setAttribute(attribute, value);
}
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function compile(row, side) {
    const source = row[side], indices = [];
    let cursor = 0, pattern = '';
    for (const match of source.matchAll(/\{(\d+)\}/g)) {
        pattern += escape(source.slice(cursor, match.index)) + '([\\s\\S]*?)';
        indices.push(Number(match[1])); cursor = match.index + match[0].length;
    }
    if (!indices.length) return null;
    pattern += escape(source.slice(cursor));
    return {row, indices, prefix:source.slice(0,source.indexOf('{')), regex: new RegExp('^' + pattern + '$'), weight: source.replace(/\{\d+\}/g, '').length};
}
const patterns = rows.flatMap(row => [compile(row, 0), compile(row, 1)]).filter(Boolean).sort((a, b) => b.weight - a.weight);
const prefixes = rows.filter(row => (row[0].endsWith(': ') || row[0].endsWith('. ')) && !/\{\d+\}/.test(row[0])).sort((a,b) => b[0].length-a[0].length);

export function translateUI(value, depth = 0, target = language) {
    if (value == null || typeof value !== 'string' || !value || depth > 5) return value;
    const exact = ko.get(value) || en.get(value);
    if (exact && !/\{\d+\}/.test(exact[0])) return exact[target === 'ko' ? 0 : 1];
    if (target === 'en' && !/[가-힣]/.test(value)) return value;
    if (value.length > 4096) return value;
    const decorated = value.match(/^(.*?)(\s+[⌄▣])$/);
    if (decorated) return translateUI(decorated[1], depth + 1, target) + decorated[2];
    for (const row of prefixes) for (const side of [0,1]) {
        if (value.startsWith(row[side])) return row[target === 'ko' ? 0 : 1] + value.slice(row[side].length);
    }
    for (const entry of patterns) {
        if (entry.prefix && !value.startsWith(entry.prefix)) continue;
        if (entry.weight < 5 && value.includes(' · ')) continue;
        const match = entry.regex.exec(value); if (!match) continue;
        const values = new Map(entry.indices.map((index, i) => [index, match[i + 1]]));
        return entry.row[target === 'ko' ? 0 : 1].replace(/\{(\d+)\}/g, (_, index) => {
            const result = values.get(Number(index)) ?? '';
            // File names, prompts, user names/notes and error details are opaque slots.
            return entry.row[2]?.includes(Number(index)) ? result : translateUI(result, depth + 1, target);
        });
    }
    // Composite UI labels are built by existing renderers without changing their data.
    const parts = value.split(/( · |\n| \| )/);
    return parts.length > 1 ? parts.map((part, i) => i % 2 ? part : translateUI(part, depth + 1, target)).join('') : value;
}
export const canonicalUI = value => translateUI(value, 0, 'ko');

export function rawUI(node) { node.dataset.uiRaw = 'true'; return node; }
export function uiParts(node, parts) {
    node.replaceChildren(...parts.map(part => {
        if (part && typeof part === 'object' && 'raw' in part) {
            const span = rawUI(node.ownerDocument.createElement('span')); span.textContent = part.raw; return span;
        }
        return node.ownerDocument.createTextNode(String(part ?? ''));
    }));
}
const attributes = ['title', 'placeholder', 'aria-label', 'aria-description', 'alt'];
const ignoredTags = new Set(['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'CODE', 'PRE']);
const ignoredClasses = new Set(['eh3-reference-name', 'eh3-gallery-project']);
function protectedElement(node) {
    return node?.dataset?.uiRaw === 'true' || [...ignoredClasses].some(name => node?.classList?.contains(name));
}

export class StudioLocalizer {
    constructor() {
        this.roots = new Map(); this.text = new WeakMap(); this.attrs = new WeakMap(); this.disposed = false;
        this.off = onUILanguageChange(() => this.flush());
    }
    watch(root) {
        if (this.roots.has(root)) return this.roots.get(root).stop;
        const Observer = root.ownerDocument?.defaultView?.MutationObserver || globalThis.MutationObserver;
        const observer = Observer ? new Observer(() => this.flush()) : null;
        const stop = () => { observer?.disconnect(); this.roots.delete(root); };
        this.roots.set(root, {observer, stop}); this.flush(); return stop;
    }
    update(record, current) {
        const source = record && current === record.display ? record.source : current;
        return {source, display: translateUI(source)};
    }
    walk(element, protectedParent = false) {
        if (element.nodeType === 3) {
            if (protectedParent) return;
            const current = element.nodeValue;
            const record = this.update(this.text.get(element), current);
            this.text.set(element, record);
            if (current !== record.display) element.nodeValue = record.display;
            return;
        }
        if (element.nodeType !== 1) return;
        const isProtected = protectedParent || protectedElement(element);
        if (isProtected) return;
        const bound = bindings.get(element);
        for (const [attribute, render] of bound || []) {
            if (attribute !== 'textContent' && !element.hasAttribute(attribute)) continue;
            const value = render();
            if (attribute === 'textContent') { if (element.textContent !== value) element.textContent = value; }
            else if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
        }
        if (element.dataset.uiRawAttrs !== 'true') {
            let records = this.attrs.get(element); if (!records) this.attrs.set(element, records = new Map());
            for (const key of attributes) {
                if (bound?.has(key)) continue;
                if ((element.dataset.uiRawAttrs || '').split(' ').includes(key)) continue;
                if (!element.hasAttribute(key)) continue;
                const value = element.getAttribute(key), record = this.update(records.get(key), value);
                records.set(key, record); if (value !== record.display) element.setAttribute(key, record.display);
            }
        }
        if (ignoredTags.has(element.tagName)) return;
        if (bound?.has('textContent')) return;
        if (element.dataset.uiRaw === 'text') return;
        for (const child of element.childNodes) this.walk(child, false);
    }
    flush() {
        if (this.disposed) return;
        // Disconnect while changing only text-node data and UI attributes; never replace controls.
        for (const {observer} of this.roots.values()) observer?.disconnect();
        for (const root of this.roots.keys()) {
            root.setAttribute('lang', language);
            this.walk(root);
            for (const button of root.querySelectorAll('[data-ui-language]')) {
                button.setAttribute('aria-pressed', String(button.dataset.uiLanguage === language));
            }
        }
        for (const [root, {observer}] of this.roots) observer?.observe(root, {
            childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attributes,
        });
    }
    dispose() {
        this.disposed = true; this.off();
        for (const {observer} of this.roots.values()) observer?.disconnect();
        this.roots.clear();
    }
}
