import importlib.util
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'custom_nodes/ComfyUI-Endless-H3-AllInOne/dependencies.py'
spec = importlib.util.spec_from_file_location('dependency_test', path)
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
installed = {name for names in module.FEATURES.values() for name in names}
assert all(value['ready'] for value in module.feature_report(installed).values())
installed.remove('H3FaceTrackCrop')
report = module.feature_report(installed)
assert not report['camera']['ready'] and report['generation']['ready']
assert report['camera']['install'][0]['pack'] == 'ComfyUI-H3-FaceRefine'
assert module.missing_graph_nodes({'1': {'class_type': 'H3FaceTrackCrop'}}, installed) == ['H3FaceTrackCrop']
assert 'ComfyUI-H3-FaceRefine' in module.describe_missing(['H3FaceTrackCrop'])
assert module.feature_report(installed)['upscale']['ready']
print('PASS: missing camera node identified; unrelated generation/upscale remain ready; no automatic installation.')
