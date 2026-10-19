"""Loopback execution service: every workflow is submitted through official Comfy SDK."""
import argparse
import asyncio
import base64
import hashlib
import json
import os
from pathlib import Path
import time
from urllib.parse import urlparse
import uuid

from aiohttp import web
from comfy_sdk import AsyncComfy, ComfyError, OutputReady, Preview, Progress, StatusChange
import httpx


def loopback_url(value):
    parsed = urlparse(value)
    if parsed.scheme != 'http' or parsed.hostname != '127.0.0.1' or not parsed.port or parsed.path not in ('', '/'):
        raise ValueError('The SDK test service accepts only http://127.0.0.1:PORT.')
    return value.rstrip('/')


def job_id(value):
    return str(uuid.UUID(value))


def snapshot(job):
    return {'prompt_id': job.id, 'sdk_job_id': job.id, 'status': job.status,
            'error': str(job.error) if job.error else None,
            'outputs': [{'node_id': o.node_id, 'name': o.name, 'content_type': o.content_type,
                         'asset_id': o.id, 'type': o.type} for o in job.outputs]}


class SDKService:
    def __init__(self, records):
        self.records = Path(records)
        self.records.mkdir(parents=True, exist_ok=True)
        self.lock = asyncio.Lock()
        self.client = None

    async def start(self, app):
        self.client = AsyncComfy()

    async def close(self, app):
        await self.client.close()

    def record_path(self, key):
        return self.records / (job_id(key) + '.json')

    def write(self, path, record):
        temporary = path.with_suffix('.tmp')
        temporary.write_text(json.dumps(record, ensure_ascii=False), encoding='utf-8')
        temporary.replace(path)

    async def health(self, request):
        return web.json_response({'app': 'Flagship Scene UI', 'execution': 'comfy-sdk',
                                  'proxy': os.environ['COMFY_BASE_URL']})

    async def submit(self, request):
        body = await request.json()
        graph = body['graph']
        if not isinstance(graph, dict) or not graph:
            raise web.HTTPBadRequest(text='graph must be a non-empty API workflow')
        key = job_id(body['request_key'])
        path = self.record_path(key)
        graph_hash = hashlib.sha256(json.dumps(graph, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        async with self.lock:
            if path.exists():
                previous = json.loads(path.read_text(encoding='utf-8'))
                if previous['graph_hash'] != graph_hash:
                    raise web.HTTPConflict(text='A different graph already uses this request key.')
                if previous.get('sdk_job_id'):
                    return web.json_response(snapshot(await self.client.jobs.get(previous['sdk_job_id'])))
                raise web.HTTPConflict(text='Submission outcome needs review; it will not be submitted again automatically.')
            record = {'request_key': key, 'graph_hash': graph_hash, 'created': time.time(), 'state': 'submitting'}
            self.write(path, record)
        try:
            workflow = self.client.workflows.from_json(graph)
            job = await self.client.submit(workflow, idempotency_key=key)
        except (ComfyError, httpx.HTTPError, OSError, TimeoutError) as error:
            rejected = isinstance(error, ComfyError) and error.code in {'invalid_workflow', 'missing_asset', 'invalid_request', 'metadata_invalid'}
            record.update(state='rejected' if rejected else 'unresolved', error=str(error))
            self.write(path, record)
            return web.json_response({'error': str(error), 'submission_uncertain': not rejected}, status=422 if rejected else 502)
        record.update(state='submitted', sdk_job_id=job.id)
        self.write(path, record)
        return web.json_response(snapshot(job))

    async def get(self, request):
        return web.json_response(snapshot(await self.client.jobs.get(job_id(request.match_info['id']))))

    async def submission(self, request):
        path = self.record_path(request.match_info['key'])
        if not path.is_file():
            return web.json_response({'state': 'unknown'})
        record = json.loads(path.read_text(encoding='utf-8'))
        if record.get('sdk_job_id'):
            return web.json_response({'state': record['state'], **snapshot(await self.client.jobs.get(record['sdk_job_id']))})
        return web.json_response({'state': record['state'], 'error': record.get('error')})

    async def cancel(self, request):
        job = await self.client.jobs.get(job_id(request.match_info['id']))
        await job.cancel()
        return web.json_response(snapshot(job))

    async def events(self, request):
        job = await self.client.jobs.get(job_id(request.match_info['id']))
        response = web.StreamResponse(headers={'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache'})
        await response.prepare(request)
        try:
            async for event in job.events():
                data = {'prompt_id': job.id}
                if isinstance(event, Preview):
                    data.update(kind='preview', mime=event.content_type, data=base64.b64encode(event.data).decode())
                elif isinstance(event, Progress):
                    data.update(kind='progress', value=event.value, step=event.step, steps=event.steps)
                elif isinstance(event, StatusChange):
                    data.update(kind='status', status=event.status)
                elif isinstance(event, OutputReady):
                    data.update(kind='output', node_id=event.output.node_id, name=event.output.name)
                else:
                    continue
                await response.write(('data: ' + json.dumps(data) + '\n\n').encode())
            # Polling remains authoritative, including when SSE is unsupported or closes early.
            await job.refresh()
            await response.write(('data: ' + json.dumps({'kind': 'status', **snapshot(job)}) + '\n\n').encode())
        except (ConnectionResetError, asyncio.CancelledError):
            pass
        return response


@web.middleware
async def errors(request, handler):
    try:
        return await handler(request)
    except web.HTTPException:
        raise
    except (KeyError, ValueError, TypeError) as error:
        return web.json_response({'error': str(error)}, status=400)
    except (ComfyError, httpx.HTTPError) as error:
        return web.json_response({'error': str(error)}, status=502)


def make_service(records):
    service = SDKService(records)
    app = web.Application(client_max_size=16 * 1024 * 1024, middlewares=[errors])
    app.on_startup.append(service.start)
    app.on_cleanup.append(service.close)
    app.add_routes([web.get('/health', service.health), web.post('/jobs', service.submit),
                    web.get('/requests/{key}', service.submission),
                    web.get('/jobs/{id}', service.get), web.post('/jobs/{id}/cancel', service.cancel),
                    web.get('/jobs/{id}/events', service.events)])
    return app


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--proxy', required=True, type=loopback_url)
    parser.add_argument('--port', required=True, type=int)
    parser.add_argument('--records', required=True)
    args = parser.parse_args()
    os.environ['COMFY_BASE_URL'] = args.proxy
    web.run_app(make_service(args.records), host='127.0.0.1', port=args.port)
