#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Export the leaderboards for every chat in config.toml as JSON for the website.

Images (group photo, funniest-message pictures) are converted to web-sized JPEGs and
uploaded to Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise written to web/public/.
Nothing is deleted until every chat has exported successfully.

Usage:
  uv run export.py            writes web/data/*.json
  uv run export.py other/dir  writes there instead (local images go to other/../public)
"""

from __future__ import annotations

import json
import logging
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

import tomllib

from images import (
    Storage,
    choose_storage,
    export_image,
    export_site_images,
    first_image,
    group_photo,
)
from imessage import (
    CHAT_DB,
    Contacts,
    Message,
    chat_name,
    find_chat_ids,
    load_chat,
    load_contacts,
    open_readonly,
    unresolved_handles,
)
from laughs import clean_text, funniest
from mentions import Options, scan
from rules import Reaction, active_laughs, active_reactions

if TYPE_CHECKING:
    import sqlite3

log = logging.getLogger("gcmetrics")

CONFIG_PATH = Path(__file__).parent / "config.toml"
TOP_MESSAGES = 10
MESSAGE_IMAGE_EDGE = "800"
PHOTO_EDGE = "256"


@dataclass(frozen=True)
class Config:
    me: str
    chats: list[str]
    word: str | None = None
    aliases: dict[str, str] = field(default_factory=dict)


def clean_string(value: object, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(f"config.toml: '{name}' must be a non-empty string")
    return value.strip()


def slug(chat: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in chat.lower()).strip("-") or "chat"


def check_unique_slugs(chats: list[str]) -> None:
    counts = Counter(slug(c) for c in chats)
    dupes = sorted(s for s, n in counts.items() if n > 1)
    if dupes:
        raise SystemExit(
            f"config.toml: chats collide on output name {dupes}; rename or use ROWIDs"
        )


def load_config(path: Path) -> Config:
    if not path.exists():
        raise SystemExit(
            f"Missing {path}. Copy config.example.toml to config.toml and fill it in."
        )
    raw = tomllib.loads(path.read_text())
    chats, aliases = raw.get("chats"), raw.get("aliases", {})
    if not isinstance(chats, list) or not chats:
        raise SystemExit("config.toml: 'chats' must be a non-empty list of chat names")
    if not isinstance(aliases, dict):
        raise SystemExit("config.toml: 'aliases' must map nickname = \"Full Name\"")
    config = Config(
        clean_string(raw.get("me"), "me"),
        [clean_string(c, "chats") for c in chats],
        None if raw.get("word") is None else clean_string(raw.get("word"), "word"),
        {
            clean_string(k, "aliases"): clean_string(v, "aliases")
            for k, v in aliases.items()
        },
    )
    check_unique_slugs(config.chats)
    return config


def per_message(
    messages: list[Message], laughs_by_guid: Counter[str]
) -> list[dict[str, object]]:
    sent: Counter[str] = Counter(m.sender for m in messages)
    got: Counter[str] = Counter()
    for m in messages:
        got[m.sender] += laughs_by_guid.get(m.guid, 0)
    rows = [
        {
            "name": name,
            "laughs": got[name],
            "messages": sent[name],
            "perMessage": round(got[name] / sent[name], 3),
        }
        for name in sent
    ]
    return sorted(
        rows, key=lambda r: (r["perMessage"], r["laughs"], r["name"]), reverse=True
    )


def laughers(
    reactions: list[Reaction], laughs: list[tuple[str, str]]
) -> list[dict[str, object]]:
    given = Counter(reactor for reactor, _ in laughs)
    favorites: dict[str, Counter[str]] = {}
    for r in active_reactions(reactions):
        favorites.setdefault(r.reactor, Counter())[r.label] += 1
    rows = [
        {"name": name, "given": n, "favorite": favorites[name].most_common(1)[0][0]}
        for name, n in given.items()
    ]
    return sorted(rows, key=lambda r: (r["given"], r["name"]), reverse=True)


@dataclass(frozen=True)
class Exporter:
    conn: sqlite3.Connection
    config: Config
    contacts: Contacts
    storage: Storage

    def funniest_rows(
        self, messages: list[Message], laughs_by_guid: Counter[str]
    ) -> list[dict[str, object]]:
        rows = []
        for m in funniest(messages, laughs_by_guid, TOP_MESSAGES):
            source = first_image(self.conn, m.guid)
            rows.append(
                {
                    "laughs": laughs_by_guid[m.guid],
                    "date": time.strftime("%Y-%m-%d", time.localtime(m.sent_at)),
                    "sender": m.sender,
                    "text": clean_text(m.text),
                    "image": export_image(self.storage, source, MESSAGE_IMAGE_EDGE)
                    if source
                    else None,
                }
            )
        return rows

    def mention_rows(self, chat_ids: list[int]) -> list[dict[str, object]]:
        if self.config.word is None:
            return []
        hits = scan(
            self.conn,
            chat_ids,
            Options(
                self.config.word, self.config.me, self.contacts, self.config.aliases
            ),
        )
        counts = Counter(h.target for h in hits if h.target)
        return [{"name": name, "times": n} for name, n in counts.most_common()]

    def chat(self, chat: str) -> dict[str, object]:
        chat_ids = find_chat_ids(self.conn, chat)
        messages, reactions = load_chat(
            self.conn, chat_ids, self.config.me, self.contacts
        )
        if not messages:
            raise SystemExit(f"{chat!r} has no messages")
        missing = unresolved_handles(self.conn, chat_ids, self.contacts)
        if missing:
            raise SystemExit(
                f"{chat!r}: no contact card for {missing}. Add them to Contacts so names are published, not numbers."
            )
        author_by_guid = {m.guid: m.sender for m in messages}
        laughs = active_laughs(reactions, author_by_guid)
        laughs_by_guid = Counter(guid for _, guid in laughs)
        photo = group_photo(self.conn, chat_ids)
        return {
            "chat": chat_name(self.conn, chat_ids[0]),
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "messageCount": len(messages),
            "laughCount": len(laughs),
            "photo": export_image(self.storage, photo, PHOTO_EDGE) if photo else None,
            "mentionWord": self.config.word,
            "mentions": self.mention_rows(chat_ids),
            "perMessage": per_message(messages, laughs_by_guid),
            "funniest": self.funniest_rows(messages, laughs_by_guid),
            "laughers": laughers(reactions, laughs),
        }


def write_exports(out_dir: Path, exports: dict[str, dict[str, object]]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.json"):
        old.unlink()
    for name, data in exports.items():
        path = out_dir / f"{name}.json"
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(f"wrote {path}")


def main(argv: list[str]) -> None:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    config = load_config(CONFIG_PATH)
    out_dir = Path(argv[0]) if argv else Path(__file__).parent / "web" / "data"
    storage = choose_storage(out_dir.parent / "public")
    exporter = Exporter(open_readonly(CHAT_DB), config, load_contacts(), storage)
    exports = {slug(chat): exporter.chat(chat) for chat in config.chats}
    write_exports(out_dir, exports)
    storage.finish()
    photo = group_photo(exporter.conn, find_chat_ids(exporter.conn, config.chats[0]))
    if photo and photo.exists():
        export_site_images(photo, out_dir.parent / "public")


if __name__ == "__main__":
    main(sys.argv[1:])
