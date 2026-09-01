"""Image lookup, conversion, and storage (local folder or Vercel Blob) for the exporter."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Protocol

from imessage import placeholders

if TYPE_CHECKING:
    import sqlite3

log = logging.getLogger("gcmetrics")

IMAGE_TYPES = (
    "image/heic",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/heic-sequence",
)
ATTACHMENTS_DIR = "attachments"
GROUP_PHOTO_ITEM = 3
GROUP_PHOTO_ACTION = 1
BLOB_API = "https://blob.vercel-storage.com"
BLOB_TOKEN_VAR = "BLOB_READ_WRITE_TOKEN"  # noqa: S105
ONE_YEAR = "31536000"
UPLOAD_TIMEOUT = 30
UPLOAD_ATTEMPTS = 3
RETRY_BASE = 2
SERVER_ERROR = 500
SIZE_LINES = 2


class Storage(Protocol):
    def put(self, name: str, data: bytes) -> str: ...
    def finish(self) -> None: ...


@dataclass
class LocalStorage:
    public_dir: Path
    written: set[str] = field(default_factory=set)

    def put(self, name: str, data: bytes) -> str:
        target = self.public_dir / ATTACHMENTS_DIR / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        self.written.add(name)
        return f"/{ATTACHMENTS_DIR}/{name}"

    def finish(self) -> None:
        for stale in (self.public_dir / ATTACHMENTS_DIR).glob("*.jpg"):
            if stale.name not in self.written:
                stale.unlink()


@dataclass(frozen=True)
class BlobStorage:
    token: str

    def put(self, name: str, data: bytes) -> str:
        headers = {
            "authorization": f"Bearer {self.token}",
            "x-api-version": "7",
            "x-content-type": "image/jpeg",
            "x-add-random-suffix": "0",
            "x-allow-overwrite": "1",
            "x-cache-control-max-age": ONE_YEAR,
        }
        url = f"{BLOB_API}/{ATTACHMENTS_DIR}/{name}"
        request = urllib.request.Request(url, data=data, headers=headers, method="PUT")  # noqa: S310
        last: Exception | None = None
        for attempt in range(UPLOAD_ATTEMPTS):
            try:
                with urllib.request.urlopen(  # noqa: S310
                    request, timeout=UPLOAD_TIMEOUT
                ) as response:
                    return blob_url(name, json.loads(response.read()))
            except urllib.error.HTTPError as err:
                if err.code < SERVER_ERROR:
                    body = err.read().decode(errors="replace")
                    raise SystemExit(
                        f"Vercel Blob {err.code} for {name}: {body}"
                    ) from err
                last = err
            except (urllib.error.URLError, TimeoutError) as err:
                last = err
            time.sleep(RETRY_BASE**attempt)
        raise SystemExit(f"Vercel Blob upload failed for {name}: {last}")

    def finish(self) -> None:
        return


def blob_url(name: str, body: object) -> str:
    url = body.get("url") if isinstance(body, dict) else None
    if not isinstance(url, str):
        raise SystemExit(f"Vercel Blob returned no url for {name}: {body}")
    return url


def choose_storage(public_dir: Path) -> Storage:
    token = os.environ.get(BLOB_TOKEN_VAR, "").strip()
    return BlobStorage(token) if token else LocalStorage(public_dir)


def sips(*args: str) -> str:
    return subprocess.run(  # noqa: S603
        ["/usr/bin/sips", *args], check=True, capture_output=True, text=True
    ).stdout


def parse_size(output: str) -> tuple[int, int] | None:
    values = [line.split()[-1] for line in output.splitlines()[1:]]
    if len(values) != SIZE_LINES or not all(v.isdigit() for v in values):
        return None
    return int(values[0]), int(values[1])


def export_image(
    storage: Storage, source: Path, max_edge: str
) -> dict[str, object] | None:
    if not source.exists():
        return None
    name = (
        hashlib.sha1(str(source).encode(), usedforsecurity=False).hexdigest()[:16]
        + ".jpg"
    )
    with tempfile.TemporaryDirectory() as tmp:
        copy, converted = Path(tmp) / source.name, Path(tmp) / name
        shutil.copy(source, copy)
        sips("-s", "format", "jpeg", "-Z", max_edge, str(copy), "--out", str(converted))
        if not converted.exists():
            log.warning("sips could not convert %s", source)
            return None
        size = parse_size(sips("-g", "pixelWidth", "-g", "pixelHeight", str(converted)))
        data = converted.read_bytes()
    if size is None:
        return None
    return {"src": storage.put(name, data), "width": size[0], "height": size[1]}


def first_image(conn: sqlite3.Connection, guid: str) -> Path | None:
    rows = conn.execute(
        "select a.filename, a.mime_type from attachment a "
        "join message_attachment_join j on j.attachment_id = a.ROWID "
        "join message m on m.ROWID = j.message_id where m.guid = ? order by a.ROWID",
        (guid,),
    ).fetchall()
    for filename, mime in rows:
        if filename and mime in IMAGE_TYPES:
            return Path(filename).expanduser()
    return None


def group_photo(conn: sqlite3.Connection, chat_ids: list[int]) -> Path | None:
    row = conn.execute(
        f"select a.filename from message m "  # noqa: S608
        f"join chat_message_join c on c.message_id = m.ROWID "
        f"join message_attachment_join j on j.message_id = m.ROWID "
        f"join attachment a on a.ROWID = j.attachment_id "
        f"where c.chat_id in ({placeholders(chat_ids)}) and m.item_type = ? and m.group_action_type = ? "
        f"and a.filename is not null order by m.date desc limit 1",
        [*chat_ids, GROUP_PHOTO_ITEM, GROUP_PHOTO_ACTION],
    ).fetchone()
    return Path(row[0]).expanduser() if row else None
