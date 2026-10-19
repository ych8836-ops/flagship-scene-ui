"""Run the isolated Flagship SDK app; never control the source ComfyUI."""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cpu', action='store_true', help='CPU smoke test, no H3 video generation')
    parser.add_argument('--no-cache', action='store_true', help='Disable Comfy graph caching for paired regression renders')
    args = parser.parse_args()
    config = json.loads((ROOT / 'config.local.json').read_text(encoding='utf-8'))
    (ROOT / 'runtime/STOP').unlink(missing_ok=True)
    ports = config['ports']
    for port in ports.values():
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', port))
    env = os.environ.copy()
    for key in ['COMFY_API_KEY', 'OPENAI_API_KEY']:
        env.pop(key, None)
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    env['PYTHONUTF8'] = '1'
    if config.get('nvidia_vfx_python'):
        env['FLAGSHIP_NVIDIA_VFX_PYTHON'] = str((ROOT / config['nvidia_vfx_python']).resolve())
    if config.get('nvoffruc_dll'):
        env['NVOFFRUC_DLL'] = str((ROOT / config['nvoffruc_dll']).resolve())
    env['FLAGSHIP_SDK_SERVICE_URL'] = f"http://127.0.0.1:{ports['sdk_service']}"
    env['FLAGSHIP_SDK_TEST_CPU'] = '1' if args.cpu else '0'
    env['COMFY_BASE_URL'] = f"http://127.0.0.1:{ports['proxy']}"
    env['HF_HUB_OFFLINE'] = '1'
    env['TRANSFORMERS_OFFLINE'] = '1'
    env['NO_PROXY'] = env.get('NO_PROXY', '') + ',127.0.0.1,localhost'
    processes, logs = [], []
    runtime = ROOT / 'runtime'
    (runtime / 'yolo_config').mkdir(exist_ok=True)
    env['YOLO_CONFIG_DIR'] = str(runtime / 'yolo_config')
    commands = [
        ('comfy', [config['comfy_python'], '-B', '-X', 'utf8', str(ROOT / 'bootstrap.py'),
                   '--listen', '127.0.0.1', '--port', str(ports['comfy']),
                   '--base-directory', str(runtime / 'data'), '--temp-directory', str(runtime / 'data/temp'),
                   '--input-directory', str(runtime / 'data/input'), '--output-directory', str(runtime / 'data/output'),
                   '--user-directory', str(runtime / 'data/user'),
                   '--database-url', 'sqlite:///' + (runtime / 'data/user/comfyui.db').as_posix(),
                   '--models-directory', config['models_directory'],
                   '--extra-model-paths-config', str(runtime / 'paths.local.yaml'),
                   '--disable-auto-launch', '--disable-api-nodes', '--max-upload-size', '5120', '--preview-method', 'latent2rgb'] + (['--cpu'] if args.cpu else []) + (['--cache-none'] if args.no_cache else [])),
        ('proxy', [config['sdk_python'], '-B', '-m', 'comfy_api_proxy.cli', 'run',
                   '--comfyui', f"http://127.0.0.1:{ports['comfy']}", '--port', str(ports['proxy']),
                   '--host', '127.0.0.1', '--max-upload-mb', '5120',
                   '--comfyui-base-dir', str(runtime / 'data'), '--state-dir', str(runtime / 'proxy_state')]),
        ('sdk', [config['sdk_python'], '-B', '-X', 'utf8', str(ROOT / 'service/sdk_service.py'),
                 '--proxy', env['COMFY_BASE_URL'], '--port', str(ports['sdk_service']),
                 '--records', str(runtime / 'sdk_requests')]),
    ]
    def interrupted(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, interrupted)
    try:
        for name, command in commands:
            log = open(runtime / (name + '.log'), 'w', encoding='utf-8')
            logs.append(log)
            process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
                                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            processes.append(process)
        record = {'launcher_pid': os.getpid(), 'pids': [p.pid for p in processes], 'ports': ports, 'cpu': args.cpu}
        (runtime / 'processes.local.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        print('Flagship Scene UI: http://127.0.0.1:' + str(ports['comfy']), flush=True)
        print('Independent input/output/projects; shared models only. Ctrl+C stops these test processes.', flush=True)
        while all(process.poll() is None for process in processes) and not (runtime / 'STOP').exists():
            time.sleep(1)
        if (runtime / 'STOP').exists():
            (runtime / 'STOP').unlink()
            return
        raise RuntimeError('A test service stopped. See runtime/comfy.log, proxy.log, sdk.log.')
    except KeyboardInterrupt:
        pass
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
        for process in reversed(processes):
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for log in logs:
            log.close()
        (runtime / 'processes.local.json').unlink(missing_ok=True)


if __name__ == '__main__':
    main()
