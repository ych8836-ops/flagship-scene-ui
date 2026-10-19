// SDK owns execution; translate its event stream for existing studio UI consumers.
export class StudioSDKEvents {
    constructor(api, finished, Source = globalThis.EventSource) {
        this.api = api; this.finished = finished; this.Source = Source;
        this.streams = new Map(); this.terminal = new Set();
    }
    sync(ids) {
        const wanted = new Set(ids.filter(Boolean));
        for (const [id, stream] of this.streams) if (!wanted.has(id)) { stream.close(); this.streams.delete(id); }
        for (const id of wanted) this.watch(id);
    }
    emit(name, detail) { this.api.dispatchEvent(new CustomEvent(name, {detail})); }
    watch(id) {
        if (!id || this.streams.has(id) || this.terminal.has(id)) return;
        const source = new this.Source(this.api.apiURL(`/endless_h3_aio/sdk/events/${encodeURIComponent(id)}`));
        this.streams.set(id, source);
        source.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.prompt_id !== id) return;
            if (data.kind === 'preview') {
                const bytes = Uint8Array.from(atob(data.data), value => value.charCodeAt(0));
                this.emit('b_preview_with_metadata', {jobId:id, blob:new Blob([bytes], {type:data.mime})});
            } else if (data.kind === 'progress') {
                this.emit('progress', {prompt_id:id, value:data.step ?? data.value * 100, max:data.steps ?? 100});
            } else if (data.kind === 'status') {
                if (data.status === 'running' && !source.started) {
                    source.started = true; this.emit('execution_start', {prompt_id:id});
                }
                const type = {succeeded:'execution_success', failed:'execution_error', canceled:'execution_interrupted', expired:'execution_error'}[data.status];
                if (type) {
                    this.terminal.add(id); source.close(); this.streams.delete(id);
                    this.emit(type, {prompt_id:id, exception_message:data.error || ''});
                    Promise.resolve(this.finished(id)).catch(() => {});
                }
            }
        };
    }
    dispose() { for (const stream of this.streams.values()) stream.close(); this.streams.clear(); this.terminal.clear(); }
}
