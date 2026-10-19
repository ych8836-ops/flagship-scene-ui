import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
setup=load('flagship_setup',ROOT/'setup.py')
deps=load('flagship_install',ROOT/'tools/install_dependencies.py')


class SetupTests(unittest.TestCase):
    def test_engine_copy_does_not_modify_source_or_copy_private_data(self):
        with tempfile.TemporaryDirectory() as temporary:
            base=Path(temporary);source=base/'source';app=base/'app';app.mkdir();source.mkdir()
            (source/'comfy_extras').mkdir();(source/'comfy_extras/nodes_minimax_h3.py').write_text('# fixture')
            (source/'main.py').write_text('# engine fixture')
            for name in ('models','custom_nodes','input','output','user'):
                (source/name).mkdir();(source/name/'private.txt').write_text('must not copy')
            python=base/'python';python.write_text('path fixture')
            before={p.relative_to(source):p.read_bytes() for p in source.rglob('*') if p.is_file()}
            with patch.object(setup,'ROOT',app):setup.prepare(source,python,python,source/'models',[18881,18882,18883])
            after={p.relative_to(source):p.read_bytes() for p in source.rglob('*') if p.is_file()}
            self.assertEqual(before,after)
            self.assertFalse(list((app/'runtime/comfy').rglob('private.txt')))
            self.assertTrue((app/'runtime/data/custom_nodes').is_dir())
            self.assertEqual(json.loads((app/'config.local.json').read_text())['ports']['comfy'],18881)

    def test_archive_cannot_escape_app_and_failed_install_is_not_committed(self):
        with tempfile.TemporaryDirectory() as temporary:
            app=Path(temporary);buffer=io.BytesIO()
            with zipfile.ZipFile(buffer,'w') as archive:archive.writestr('repo/../../escape.py','bad')
            data=buffer.getvalue()
            item=dict(id='bad',repo='fixture',revision='fixture',folder='bad',feature='core',url='https://example.invalid/x',sha256=hashlib.sha256(data).hexdigest())
            (app/'dependencies.lock.json').write_text(json.dumps(dict(repositories=[item],files=[])))
            with patch.object(deps,'ROOT',app),patch.object(deps,'download',return_value=data):
                with self.assertRaisesRegex(ValueError,'escapes'):deps.install({'core'})
            self.assertFalse((app/'runtime/external_nodes/bad').exists())
            self.assertFalse((app/'runtime/escape.py').exists())

    def test_checksum_failure_is_explicit(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache=Path(temporary);(cache/'fixture.download').write_bytes(b'wrong')
            with self.assertRaisesRegex(ValueError,'checksum'):
                deps.download(dict(id='fixture',url='https://example.invalid',sha256='0'*64),cache)


if __name__=='__main__':unittest.main()
