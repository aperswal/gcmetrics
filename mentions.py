#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Who gets called a word most, across one or more group chats.

A message containing the word is attributed to a person by these rules, in order:
  1. the message names a chat member (first name or an --alias) -> that member
  2. the message is a reply in a thread -> a member named in the thread's first message, else its author
  3. otherwise -> the last other person who spoke before the message

First names shared by two members are ignored; add an --alias for each of them.

Usage:
  uv run mentions.py fob "Chat One" "Chat Two" --me "Your Name" --alias Sam="Samuel Example"
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
from collections import Counter
from dataclasses import dataclass
from typing import TYPE_CHECKING

from imessage import (
    CHAT_DB,
    Contacts,
    chat_name,
    decode_body,
    find_chat_ids,
    load_contacts,
    open_readonly,
    placeholders,
    sender_name,
)

if TYPE_CHECKING:
    import sqlite3

log = logging.getLogger("gcmetrics")

Pattern = tuple[re.Pattern[str], str]


@dataclass(frozen=True)
class Options:
    word: str
    me: str
    contacts: Contacts
    aliases: dict[str, str]


@dataclass(frozen=True)
class Hit:
    chat: str
    sender: str
    text: str
    target: str | None
    rule: str


def load_messages(
    conn: sqlite3.Connection, chat_ids: list[int], me: str, contacts: Contacts
) -> list[tuple[str, str, str | None, str]]:
    rows = conn.execute(
        f"select m.guid, m.is_from_me, h.id, m.text, m.attributedBody, m.thread_originator_guid "  # noqa: S608
        f"from message m join chat_message_join j on j.message_id = m.ROWID "
        f"left join handle h on h.ROWID = m.handle_id "
        f"where j.chat_id in ({placeholders(chat_ids)}) and m.associated_message_type = 0 "
        f"and m.item_type = 0 order by m.date",
        chat_ids,
    ).fetchall()
    return [
        (
            guid,
            sender_name(from_me, handle, me, contacts),
            thread,
            text or decode_body(body),
        )
        for guid, from_me, handle, text, body, thread in rows
    ]


def first_names(members: set[str]) -> dict[str, str]:
    counts = Counter(m.split()[0].lower() for m in members if m.strip())
    shared = sorted(first for first, n in counts.items() if n > 1)
    if shared:
        log.warning(
            "First names shared by several members are ignored: %s. Add an alias for each.",
            shared,
        )
    return {
        m.split()[0]: m
        for m in sorted(members)
        if m.strip() and counts[m.split()[0].lower()] == 1
    }


def name_patterns(members: set[str], aliases: dict[str, str]) -> list[Pattern]:
    pairs = first_names(members)
    pairs.update(aliases)
    return [
        (re.compile(rf"\b{re.escape(alias)}\b", re.IGNORECASE), full)
        for alias, full in pairs.items()
    ]


def first_named(text: str, patterns: list[Pattern]) -> str | None:
    named = sorted(
        (m.start(), full) for pattern, full in patterns if (m := pattern.search(text))
    )
    return named[0][1] if named else None


def attribute(
    text: str, thread_subject: str | None, previous: str | None, patterns: list[Pattern]
) -> tuple[str | None, str]:
    named = first_named(text, patterns)
    if named:
        return named, "name"
    if thread_subject:
        return thread_subject, "reply"
    if previous:
        return previous, "last speaker"
    return None, "none"


def scan(conn: sqlite3.Connection, chat_ids: list[int], opts: Options) -> list[Hit]:
    messages = load_messages(conn, chat_ids, opts.me, opts.contacts)
    author_by_guid = {guid: sender for guid, sender, _, _ in messages}
    patterns = name_patterns(set(author_by_guid.values()), opts.aliases)
    subject_by_guid = {
        guid: first_named(text, patterns) or sender
        for guid, sender, _, text in messages
    }
    word_re = re.compile(rf"\b{re.escape(opts.word)}\w*", re.IGNORECASE)
    label = chat_name(conn, chat_ids[0])
    hits = []
    last: str | None = None
    before_last: str | None = None
    for _, sender, thread, text in messages:
        if word_re.search(text):
            other = before_last if last == sender else last
            target, rule = attribute(
                text, subject_by_guid.get(thread or ""), other, patterns
            )
            hits.append(Hit(label, sender, " ".join(text.split()), target, rule))
        if sender != last:
            before_last, last = last, sender
    return hits


def report(word: str, hits: list[Hit]) -> None:
    counts = Counter(h.target for h in hits if h.target)
    print(
        f"'{word}' appears in {len(hits)} messages, {sum(counts.values())} attributed\n"
    )
    print(f"{'#':>2}  {'called ' + word:<20}  {'times':>5}")
    for rank, (name, n) in enumerate(counts.most_common(), 1):
        print(f"{rank:>2}  {name:<20}  {n:>5}")
    print("\n== Every mention ==")
    for h in hits:
        print(
            f"[{h.chat}] {h.sender}: {h.text[:100]}  ->  {h.target or '(unattributed)'} [{h.rule}]"
        )


def parse_alias(raw: str) -> tuple[str, str]:
    alias, _, full = raw.partition("=")
    if not alias.strip() or not full.strip():
        msg = f"--alias must look like Nick=Full Name, got {raw!r}"
        raise argparse.ArgumentTypeError(msg)
    return alias.strip(), full.strip()


def main(argv: list[str]) -> None:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("word")
    parser.add_argument("chats", nargs="+", help="chat names or ROWIDs")
    parser.add_argument("--me", default="Me")
    parser.add_argument(
        "--alias", action="append", type=parse_alias, default=[], help="Nick=Full Name"
    )
    args = parser.parse_args(argv)
    if not args.word.strip() or not args.me.strip():
        parser.error("word and --me must not be empty")
    conn = open_readonly(CHAT_DB)
    opts = Options(
        args.word.strip(), args.me.strip(), load_contacts(), dict(args.alias)
    )
    hits = [
        hit
        for chat in args.chats
        for hit in scan(conn, find_chat_ids(conn, chat), opts)
    ]
    report(args.word, hits)


if __name__ == "__main__":
    main(sys.argv[1:])
