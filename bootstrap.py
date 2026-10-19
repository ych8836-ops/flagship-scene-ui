"""Run the copied engine ahead of portable Python's original source path."""
import os
from pathlib import Path
import runpy
import sys
core=Path(__file__).resolve().parent/'runtime/comfy'
if not (core/'main.py').is_file():raise RuntimeError('Run setup.py first.')
sys.path.insert(0,str(core));os.chdir(core)
sys.argv[0]=str(core/'main.py')
runpy.run_path(sys.argv[0],run_name='__main__')
