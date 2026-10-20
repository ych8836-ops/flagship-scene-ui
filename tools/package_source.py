"""Build a source-only ZIP from Git-visible files; never include the local runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {'.git', '.sdk-venv', 'runtime', '__pycache__', 'node_modules', 'vendor', 'fonts', 'dist'}
EXCLUDED_SUFFIXES = {'.pyc', '.dll', '.pyd', '.exe', '.safetensors', '.pt', '.onnx', '.bin', '.mp4', '.wav', '.mov', '.ttf', '.woff2'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ROOT):
        raise ValueError('Write the release archive outside the source repository.')
    listed = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT)
    names = sorted(set(name for name in listed.decode('utf-8').split('\0') if name and name != 'SOURCE_MANIFEST.json'))
    records = []
    for name in names:
        relative = Path(name)
        path = ROOT / relative
        native_asset = relative.parts[0] == 'native' and (
            '/fonts/' in name or '/vendor/' in name)
        blocked_parts = set(relative.parts) & EXCLUDED_PARTS
        if native_asset:
            blocked_parts -= {'fonts', 'vendor'}
        blocked_part = bool(blocked_parts)
        blocked_suffix = path.suffix.lower() in EXCLUDED_SUFFIXES and not (
            native_asset and path.suffix.lower() in {'.ttf', '.woff2'})
        if blocked_part or blocked_suffix:
            raise ValueError('Unexpected private/binary file in source list: ' + name)
        if relative.name in {'config.local.json', '.env'} or not path.resolve().is_relative_to(ROOT) or path.is_symlink():
            raise ValueError('Invalid source entry: ' + name)
        data = path.read_bytes()
        records.append(dict(path=name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    manifest = json.dumps(dict(format=1, files=records), indent=2).encode('utf-8') + b'\n'
    (ROOT / 'SOURCE_MANIFEST.json').write_bytes(manifest)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for record in records:
            archive.write(ROOT / record['path'], 'flagship-scene-ui/' + record['path'])
        archive.writestr('flagship-scene-ui/SOURCE_MANIFEST.json', manifest)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        for record in records:
            actual = archive.read('flagship-scene-ui/' + record['path'])
            assert hashlib.sha256(actual).hexdigest() == record['sha256']
    print(json.dumps(dict(archive=str(output), source_files=len(records), bytes=output.stat().st_size,
                         sha256=hashlib.sha256(output.read_bytes()).hexdigest()), indent=2))


if __name__ == '__main__':
    main()
