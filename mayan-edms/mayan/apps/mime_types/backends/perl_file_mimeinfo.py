import pathlib
from shutil import copyfileobj
import subprocess

from django.utils.translation import gettext_lazy as _

from mayan.apps.dependencies.exceptions import DependenciesException
from mayan.apps.storage.utils import NamedTemporaryFile

from ..classes import MIMETypeBackend

from .literals import DEFAULT_MIMETYPE_PATH


class MIMETypeBackendPerlFileMIMEInfo(MIMETypeBackend):
    def _init(self, copy_length=None, mimetype_path=None):
        self.mimetype_path = mimetype_path or DEFAULT_MIMETYPE_PATH
        self.copy_length = copy_length

        path = pathlib.Path(self.mimetype_path)

        if not path.is_file():
            raise DependenciesException(
                _(message='mimetype command not installed or not found.')
            )

    def _get_mime_type(self, file_object, mime_type_only):
        with NamedTemporaryFile() as temporary_file_object:
            file_object.seek(0)
            copyfileobj(
                fsrc=file_object, fdst=temporary_file_object,
                length=self.copy_length
            )
            file_object.seek(0)
            temporary_file_object.seek(0)

            cmd = [
                self.mimetype_path, '--magic-only', temporary_file_object.name
            ]
            completed = subprocess.run(
                args=cmd, capture_output=True, check=False, text=True
            )
            filename, mime_type = (completed.stdout or '').strip().split()

            return (mime_type, 'binary')
