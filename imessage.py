"""Read-only access to the Mac iMessage database and Contacts."""

from __future__ import annotations

import logging
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from rules import (
    REMOVED_TAPBACK_BASE,
    TAPBACK_MAX,
    TAPBACK_MIN,
    TEXT_LAUGH,
    Reaction,
    is_laugh_text,
)

log = logging.getLogger("gcmetrics")

CHAT_DB = Path.home() / "Library/Messages/chat.db"
CONTACTS_DIR = Path.home() / "Library/Application Support/AddressBook/Sources"
APPLE_EPOCH = 978307200
NANOSECOND_THRESHOLD = 1e11
LEN_2_BYTES = 0x81
LEN_4_BYTES = 0x82
KEY_DIGITS = 7
MIN_GROUP_HANDLES = 2

Contacts = dict[str, tuple[str, str]]
Row = tuple[
    str,
    int,
    str | None,
    int,
    int,
    str | None,
    str | None,
    str | None,
    bytes | None,
    int,
    str | None,
]

MESSAGE_SQL = (
    "select m.guid, m.is_from_me, h.id, m.date, m.associated_message_type, "
    "m.associated_message_guid, m.associated_message_emoji, m.text, m.attributedBody, "
    "m.item_type, m.thread_originator_guid "
    "from message m join chat_message_join j on j.message_id = m.ROWID "
    "left join handle h on h.ROWID = m.handle_id where j.chat_id in ({ids}) order by m.date"
)
SENDER_SQL = (
    "select distinct h.id from message m join chat_message_join j on j.message_id = m.ROWID "
    "join handle h on h.ROWID = m.handle_id where j.chat_id in ({ids}) and m.is_from_me = 0"
)


@dataclass(frozen=True)
class Message:
    guid: str
    sender: str
    sent_at: float
    text: str


def open_readonly(path: Path) -> sqlite3.Connection:
    try:
        conn = sqlite3.connect(f"file:{path}?mode=ro&immutable=1", uri=True)
        conn.execute("select 1 from sqlite_master limit 1")
    except sqlite3.OperationalError as err:
        msg = (
            f"Cannot open {path}: {err}. Give your terminal Full Disk Access and retry."
        )
        raise SystemExit(msg) from err
    return conn


def placeholders(ids: list[int]) -> str:
    return ",".join("?" * len(ids))


def to_unix(apple_date: int) -> float:
    seconds = (
        apple_date / 1e9 if apple_date > NANOSECOND_THRESHOLD else float(apple_date)
    )
    return seconds + APPLE_EPOCH


def target_of(associated_guid: str) -> str:
    if "/" in associated_guid:
        return associated_guid.split("/", 1)[1]
    if associated_guid.startswith("bp:"):
        return associated_guid[3:]
    return associated_guid


def decode_body(body: bytes | None) -> str:
    if not body:
        return ""
    marker = body.find(b"NSString")
    if marker < 0:
        return ""
    pos = marker + len(b"NSString") + 5
    flag = body[pos]
    if flag == LEN_2_BYTES:
        length, pos = int.from_bytes(body[pos + 1 : pos + 3], "little"), pos + 3
    elif flag == LEN_4_BYTES:
        length, pos = int.from_bytes(body[pos + 1 : pos + 5], "little"), pos + 5
    else:
        length, pos = flag, pos + 1
    return body[pos : pos + length].decode("utf-8", errors="replace")


def normalize_handle(handle: str) -> str:
    if "@" in handle:
        return handle.strip().lower()
    return re.sub(r"\D", "", handle)


def contact_key(normalized: str) -> str:
    return normalized if "@" in normalized else normalized[-KEY_DIGITS:]


def contact_rows(db_path: Path) -> list[tuple[str | None, str | None, str | None]]:
    conn = sqlite3.connect(f"file:{db_path}?mode=ro&immutable=1", uri=True)
    phones = conn.execute(
        "select p.ZFULLNUMBER, r.ZFIRSTNAME, r.ZLASTNAME from ZABCDPHONENUMBER p "
        "join ZABCDRECORD r on r.Z_PK = p.ZOWNER"
    ).fetchall()
    emails = conn.execute(
        "select e.ZADDRESS, r.ZFIRSTNAME, r.ZLASTNAME from ZABCDEMAILADDRESS e "
        "join ZABCDRECORD r on r.Z_PK = e.ZOWNER"
    ).fetchall()
    return phones + emails


def load_contacts() -> Contacts:
    names: Contacts = {}
    for db_path in sorted(CONTACTS_DIR.glob("*/AddressBook-v22.abcddb")):
        try:
            rows = contact_rows(db_path)
        except sqlite3.OperationalError as err:
            log.warning("Skipping contacts db %s: %s", db_path, err)
            continue
        for handle, first, last in rows:
            full = " ".join(part for part in (first, last) if part).strip()
            normalized = normalize_handle(handle or "")
            if normalized and full:
                names.setdefault(contact_key(normalized), (normalized, full))
    return names


def resolve_name(contacts: Contacts, handle: str) -> str | None:
    normalized = normalize_handle(handle)
    entry = contacts.get(contact_key(normalized))
    if entry is None:
        return None
    stored, name = entry
    return name if normalized.endswith(stored) or stored.endswith(normalized) else None


def sender_name(from_me: int, handle: str | None, me: str, contacts: Contacts) -> str:
    if from_me:
        return me
    return resolve_name(contacts, handle or "") or handle or "unknown"


def list_chats(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        "select c.ROWID, coalesce(nullif(c.display_name, ''), c.chat_identifier), "
        "(select count(*) from chat_handle_join h where h.chat_id = c.ROWID) as members, "
        "(select count(*) from chat_message_join m where m.chat_id = c.ROWID) as msgs "
        "from chat c where members >= ? order by msgs desc limit 40",
        (MIN_GROUP_HANDLES,),
    ).fetchall()
    print(f"{'ROWID':>6}  {'members':>7}  {'messages':>8}  name")
    for rowid, name, members, msgs in rows:
        print(f"{rowid:>6}  {members:>7}  {msgs:>8}  {name}")


def chat_name(conn: sqlite3.Connection, chat_id: int) -> str:
    row = conn.execute(
        "select coalesce(nullif(display_name, ''), chat_identifier) from chat where ROWID = ?",
        (chat_id,),
    ).fetchone()
    return str(row[0]).strip() if row else str(chat_id)


def chats_named(conn: sqlite3.Connection, query: str) -> list[tuple[int, str]]:
    rows = conn.execute(
        "select ROWID, coalesce(display_name, '') from chat "
        "where lower(display_name) like ? or chat_identifier = ?",
        (f"%{query.lower()}%", query),
    ).fetchall()
    exact = [
        (rowid, name) for rowid, name in rows if name.strip().lower() == query.lower()
    ]
    return exact or rows


def warn_if_members_differ(
    conn: sqlite3.Connection, ids: list[int], query: str
) -> None:
    member_sets = {
        frozenset(
            h
            for (h,) in conn.execute(
                "select handle_id from chat_handle_join where chat_id = ?", (i,)
            )
        )
        for i in ids
    }
    if len(member_sets) > 1:
        log.warning(
            "%r matches %d chats with different members (ROWIDs %s); merging them. Use one ROWID to pick one.",
            query,
            len(ids),
            ids,
        )


def find_chat_ids(conn: sqlite3.Connection, query: str) -> list[int]:
    query = query.strip()
    if (
        query.isdecimal()
        and conn.execute("select 1 from chat where ROWID = ?", (int(query),)).fetchone()
    ):
        return [int(query)]
    rows = chats_named(conn, query)
    if not rows:
        msg = f"No group chat matches {query!r}. Run laughs.py --list to see names."
        raise SystemExit(msg)
    names = {name for _, name in rows}
    if len(names) > 1:
        msg = f"{query!r} matches several chats: {sorted(names)}. Be more specific."
        raise SystemExit(msg)
    ids = [rowid for rowid, _ in rows]
    warn_if_members_differ(conn, ids, query)
    return ids


def parse_row(
    row: Row, me: str, contacts: Contacts
) -> tuple[Message | None, Reaction | None]:
    guid, from_me, handle, date, kind, target, emoji, text, body, item_type, thread = (
        row
    )
    sender = sender_name(from_me, handle, me, contacts)
    sent_at = to_unix(date)
    if TAPBACK_MIN <= kind <= TAPBACK_MAX:
        is_add = kind < REMOVED_TAPBACK_BASE
        return None, Reaction(
            sender, target_of(target or ""), sent_at, is_add, kind, emoji
        )
    if kind != 0 or item_type != 0:
        return None, None
    content = text or decode_body(body)
    reaction = None
    if thread and is_laugh_text(content):
        reaction = Reaction(
            sender, thread, sent_at, is_add=True, kind=TEXT_LAUGH, emoji=None
        )
    return Message(guid, sender, sent_at, content), reaction


def load_chat(
    conn: sqlite3.Connection, chat_ids: list[int], me: str, contacts: Contacts
) -> tuple[list[Message], list[Reaction]]:
    messages: list[Message] = []
    reactions: list[Reaction] = []
    for row in conn.execute(MESSAGE_SQL.format(ids=placeholders(chat_ids)), chat_ids):
        message, reaction = parse_row(row, me, contacts)
        if message:
            messages.append(message)
        if reaction:
            reactions.append(reaction)
    return messages, reactions


def unresolved_handles(
    conn: sqlite3.Connection, chat_ids: list[int], contacts: Contacts
) -> list[str]:
    rows = conn.execute(SENDER_SQL.format(ids=placeholders(chat_ids)), chat_ids)
    return sorted(
        handle for (handle,) in rows if resolve_name(contacts, handle) is None
    )
