"""Local HTTP boundary; official SDK dependencies live in the separate service."""
import os
from urllib.parse import urlparse

from aiohttp import ClientError, ClientSession, ClientTimeout, web

BASE_URL = os.environ.get('FLAGSHIP_SDK_SERVICE_URL', '').rstrip('/')
parsed = urlparse(BASE_URL)
if parsed.scheme != 'http' or parsed.hostname != '127.0.0.1' or not parsed.port or parsed.path not in ('', '/'):
    raise RuntimeError('SDK test requires its separate loopback service; native queue fallback is disabled.')


class SDKBridgeError(RuntimeError):
    def __init__(self, message, uncertain=False):
        super().__init__(message)
        self.uncertain = uncertain


async def call(path, data=None):
    try:
        async with ClientSession(timeout=ClientTimeout(total=90)) as session:
            async with session.request('GET' if data is None else 'POST', BASE_URL + path, json=data) as response:
                if response.content_type == 'application/json':
                    result = await response.json()
                else:
                    result = {'error': await response.text()}
                if response.status >= 400:
                    raise SDKBridgeError(result.get('error', 'SDK request failed'), result.get('submission_uncertain', response.status >= 500 or response.status == 409))
                return result
    except (ClientError, TimeoutError) as error:
        raise SDKBridgeError('SDK service connection failed: ' + str(error), uncertain=data is not None) from error


async def events(request):
    # This route is same-origin for the browser. The SDK service remains loopback-only.
    from uuid import UUID
    identifier = str(UUID(request.match_info['id']))
    async with ClientSession(timeout=ClientTimeout(total=None, sock_connect=10)) as session:
        async with session.get(BASE_URL + '/jobs/' + identifier + '/events') as upstream:
            if upstream.status != 200:
                return web.Response(status=upstream.status, text=await upstream.text())
            response = web.StreamResponse(headers={'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache'})
            await response.prepare(request)
            try:
                async for chunk in upstream.content.iter_any():
                    await response.write(chunk)
            except ConnectionResetError:
                pass
            return response
