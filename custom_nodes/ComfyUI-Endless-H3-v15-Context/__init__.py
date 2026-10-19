"""Distinct Endless IDs over separately installed Motion Context 0.6.2."""
import importlib.util
from pathlib import Path
import sys
source=Path(__file__).resolve().parents[2]/'runtime/dependencies/motion_context'
spec=importlib.util.spec_from_file_location('_flagship_motion_context',source/'__init__.py',submodule_search_locations=[str(source)])
module=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=module
spec.loader.exec_module(module)
core=('MiniMaxH3MotionContext','MiniMaxH3MotionContextTrim','MiniMaxH3MotionContextSaveLatent','MiniMaxH3MotionContextLoadLatent')
NODE_CLASS_MAPPINGS={'EndlessV15'+name:module.NODE_CLASS_MAPPINGS[name] for name in core}
NODE_DISPLAY_NAME_MAPPINGS={'EndlessV15'+name:'Endless v1.5 · '+module.NODE_DISPLAY_NAME_MAPPINGS[name] for name in core}
