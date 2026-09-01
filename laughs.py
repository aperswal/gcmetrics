#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Laugh-react leaderboard for one iMessage group chat. See rules.py for what counts as a laugh.

Usage:
  uv run laughs.py --list                        list group chats, biggest first
  uv run laughs.py "Chat One"                    run the report for a chat (name or chat ROWID)
  uv run laughs.py "Chat One" --me "Your Name" --top 15

Needs Full Disk Access for your terminal app (System Settings > Privacy & Security > Full Disk Access).
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from collections import Counter
from dataclasses import dataclass

from imessage import (
    CHAT_DB,
    Message,
    find_chat_ids,
    list_chats,
    load_chat,
    load_contacts,
    open_readonly,
)
from rules import active_laughs

DAY = 86400
WINDOWS = (("All time", None), ("Past 365 days", 365 * DAY), ("Past 30 days", 30 * DAY))


@dataclass(frozen=True)
class Row:
    name: str
    laughs: int
    messages: int

    @property
    def per_message(self) -> float:
        return self.laughs / self.messages if self.messages else 0.0


def leaderboard(
    messages: list[Message], laughs_by_guid: Counter[str], since: float | None
) -> list[Row]:
    sent: Counter[str] = Counter()
    got: Counter[str] = Counter()
    for m in messages:
        if since is not None and m.sent_at < since:
            continue
        sent[m.sender] += 1
        got[m.sender] += laughs_by_guid.get(m.guid, 0)
    return [Row(name, got[name], sent[name]) for name in sent]


def funniest(
    messages: list[Message], laughs_by_guid: Counter[str], top: int
) -> list[Message]:
    laughed_at = [m for m in messages if laughs_by_guid.get(m.guid, 0) > 0]
    return sorted(laughed_at, key=lambda m: laughs_by_guid[m.guid], reverse=True)[:top]


def clean_text(text: str) -> str:
    return " ".join(text.replace("￼", "").split())


def print_table(title: str, rows: list[Row], key: str) -> None:
    ordered = sorted(rows, key=lambda r: (getattr(r, key), r.laughs), reverse=True)
    width = max((len(r.name) for r in ordered), default=4)
    print(f"\n== {title} ==")
    print(f"{'#':>2}  {'name':<{width}}  {'laughs':>6}  {'msgs':>6}  {'per msg':>7}")
    for rank, r in enumerate(ordered, 1):
        print(
            f"{rank:>2}  {r.name:<{width}}  {r.laughs:>6}  {r.messages:>6}  {r.per_message:>7.3f}"
        )


def print_pairs(
    laughs: list[tuple[str, str]], author_by_guid: dict[str, str], top: int
) -> None:
    pairs = Counter(
        (reactor, author_by_guid[guid])
        for reactor, guid in laughs
        if guid in author_by_guid
    )
    print(f"\n== Who laughs at whom (top {top}) ==")
    for (reactor, author), n in pairs.most_common(top):
        print(f"{n:>5}  {reactor} -> {author}")


def print_funniest(
    messages: list[Message], laughs_by_guid: Counter[str], top: int
) -> None:
    print(f"\n== Funniest messages of all time (top {top}) ==")
    for m in funniest(messages, laughs_by_guid, top):
        when = time.strftime("%Y-%m-%d", time.localtime(m.sent_at))
        text = clean_text(m.text) or "[attachment]"
        print(f"{laughs_by_guid[m.guid]:>5}  {when}  {m.sender}: {text[:120]}")


def run(query: str, me: str, top: int) -> None:
    conn = open_readonly(CHAT_DB)
    chat_ids = find_chat_ids(conn, query)
    messages, reactions = load_chat(conn, chat_ids, me, load_contacts())
    author_by_guid = {m.guid: m.sender for m in messages}
    laughs = active_laughs(reactions, author_by_guid)
    laughs_by_guid = Counter(guid for _, guid in laughs)
    now = time.time()
    print(f"Chat {query!r}: {len(messages)} messages, {len(laughs)} laugh reacts")
    print_table(
        "Total laugh reacts (all time)",
        leaderboard(messages, laughs_by_guid, None),
        "laughs",
    )
    for title, span in WINDOWS:
        since = None if span is None else now - span
        print_table(
            f"Laughs per message ({title.lower()})",
            leaderboard(messages, laughs_by_guid, since),
            "per_message",
        )
    print_pairs(laughs, author_by_guid, top)
    print_funniest(messages, laughs_by_guid, top)


def main(argv: list[str]) -> None:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("chat", nargs="?", help="group chat name or chat ROWID")
    parser.add_argument("--me", default="Me", help="your name in the tables")
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="rows in the pairs and funniest-message lists",
    )
    parser.add_argument("--list", action="store_true", help="list group chats and exit")
    args = parser.parse_args(argv)
    if args.list:
        list_chats(open_readonly(CHAT_DB))
        return
    if not args.chat or not args.me.strip():
        parser.error("give a chat name and a non-empty --me, or use --list")
    run(args.chat, args.me.strip(), args.top)


if __name__ == "__main__":
    main(sys.argv[1:])
