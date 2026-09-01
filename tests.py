#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Unit tests for the pure parts of the exporter. Run with: uv run tests.py"""

# ruff: noqa: PT009, PT027, FBT003

from __future__ import annotations

import logging
import tempfile
import unittest
from pathlib import Path

from export import check_unique_slugs, load_config, slug
from images import parse_size
from imessage import (
    contact_key,
    decode_body,
    normalize_handle,
    resolve_name,
    target_of,
    to_unix,
)
from mentions import first_named, name_patterns
from rules import Reaction, active_laughs, base_emoji, is_laugh, is_laugh_text

LAUGHS = [
    "lol",
    "LOL",
    "lolol",
    "loool",
    "lolll",
    "LOLOLOLOLO",
    "LLLLLLLOOL",
    "lolz",
    "lmao",
    "LMFAO",
    "lmaooo",
]
LAUGHS += [
    "ha",
    "haha",
    "HAHAHAHAHAHA",
    "hahah",
    "ahaha",
    "aha",
    "HAAHIOAJHA(HAHHAHA",
    "bahaha",
    "muahaha",
]
LAUGHS += ["haaa", "lol no way", "that was hahaha funny"]
NOT_LAUGHS = [
    "hall",
    "hat",
    "lollipop",
    "halo",
    "half",
    "ok",
    "what",
    "yeah",
    "ah",
    "ahh",
    "ahhh",
    "loo",
]
NOT_LAUGHS += [
    "hannah",
    "sarah",
    "sasha",
    "aisha",
    "ahmad",
    "allah",
    "shah",
    "hash",
    "halal",
    "sahara",
]
NOT_LAUGHS += ["It's halal too", "Bro saketh", "hahn", ""]


class LaughWords(unittest.TestCase):
    def test_laugh_words(self) -> None:
        for text in LAUGHS:
            self.assertTrue(is_laugh_text(text), text)

    def test_not_laugh_words(self) -> None:
        for text in NOT_LAUGHS:
            self.assertFalse(is_laugh_text(text), text)


class Tapbacks(unittest.TestCase):
    def test_kinds(self) -> None:
        self.assertTrue(is_laugh(2003, None))
        self.assertTrue(is_laugh(2000, None))
        self.assertTrue(is_laugh(2007, None))
        self.assertTrue(is_laugh(2006, "💀"))
        self.assertFalse(is_laugh(2001, None))
        self.assertFalse(is_laugh(2002, None))
        self.assertFalse(is_laugh(2004, None))
        self.assertFalse(is_laugh(2005, None))
        self.assertFalse(is_laugh(0, None))
        self.assertFalse(is_laugh(4000, None))

    def test_bad_emoji_variants(self) -> None:
        for emoji in ("👍", "👍🏽", "👎🏻", "❗", "❗️", "‼️", "❓️"):
            self.assertFalse(is_laugh(2006, emoji), emoji)
        self.assertEqual(base_emoji("👍🏽"), "👍")
        self.assertEqual(Reaction("a", "g", 1, True, 2006, "❤️").label, "❤")

    def test_active_laughs_drops_removed_self_and_duplicates(self) -> None:
        reactions = [
            Reaction("bob", "m1", 1, True, 2003, None),
            Reaction("bob", "m1", 2, False, 3003, None),
            Reaction("bob", "m2", 3, True, 2003, None),
            Reaction("bob", "m2", 4, True, 2006, "😂"),
            Reaction("amy", "m3", 5, True, 2003, None),
            Reaction("amy", "m2", 6, True, 2001, None),
        ]
        laughs = active_laughs(reactions, {"m1": "amy", "m2": "amy", "m3": "amy"})
        self.assertEqual(laughs, [("bob", "m2")])

    def test_removal_wins_by_time_not_order(self) -> None:
        reactions = [
            Reaction("bob", "m1", 9, False, 3003, None),
            Reaction("bob", "m1", 1, True, 2003, None),
        ]
        self.assertEqual(active_laughs(reactions, {}), [])


class Handles(unittest.TestCase):
    def test_phone_and_email_resolution(self) -> None:
        contacts = {}
        for handle, name in (
            ("(201) 273-2775", "Ann Lee"),
            ("9123 4567", "Sing Tan"),
            ("Bob@Example.com", "Bob"),
        ):
            normalized = normalize_handle(handle)
            contacts[contact_key(normalized)] = (normalized, name)
        self.assertEqual(resolve_name(contacts, "+12012732775"), "Ann Lee")
        self.assertEqual(resolve_name(contacts, "+6591234567"), "Sing Tan")
        self.assertEqual(resolve_name(contacts, "bob@example.com"), "Bob")
        self.assertIsNone(resolve_name(contacts, "+15550000000"))
        self.assertIsNone(resolve_name(contacts, "+19992732775"))

    def test_helpers(self) -> None:
        self.assertEqual(target_of("p:0/ABC"), "ABC")
        self.assertEqual(target_of("bp:ABC"), "ABC")
        self.assertEqual(target_of("ABC"), "ABC")
        self.assertEqual(to_unix(0), 978307200)
        self.assertEqual(to_unix(1_000_000_000_000_000_000), 978307200 + 1_000_000_000)
        body = b"\x00NSString\x01\x94\x84\x01+\x05hello\x86"
        self.assertEqual(decode_body(body), "hello")
        self.assertEqual(decode_body(None), "")
        self.assertEqual(decode_body(b"junk"), "")


class Names(unittest.TestCase):
    def test_shared_first_names_are_ignored(self) -> None:
        logging.disable(logging.WARNING)
        patterns = name_patterns(
            {"Adith N", "Adith K", "Sam Example", "  "}, {"Sammy": "Sam Example"}
        )
        logging.disable(logging.NOTSET)
        self.assertEqual(first_named("adith is here", patterns), None)
        self.assertEqual(first_named("yo Sammy and sam", patterns), "Sam Example")
        self.assertEqual(first_named("no one", patterns), None)


class ConfigTests(unittest.TestCase):
    def test_slugs(self) -> None:
        self.assertEqual(slug("Chat One"), "chat-one")
        self.assertEqual(slug("🔥🔥"), "chat")
        with self.assertRaises(SystemExit):
            check_unique_slugs(["Chat One", "chat-one"])

    def test_load_config_rejects_blank_values(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "config.toml"
            for text in (
                'me = " "\nchats = ["A"]',
                'me = "Me"\nchats = [""]',
                'me = "Me"\nchats = ["A"]\n[aliases]\n"" = "X"',
            ):
                path.write_text(text)
                with self.assertRaises(SystemExit):
                    load_config(path)
            path.write_text(
                'me = " Me "\nchats = [" A "]\nword = "fob"\n[aliases]\nSam = "Sam Example"'
            )
            config = load_config(path)
            self.assertEqual(
                (config.me, config.chats, config.word), ("Me", ["A"], "fob")
            )
            self.assertEqual(config.aliases, {"Sam": "Sam Example"})
        with self.assertRaises(SystemExit):
            load_config(Path(tmp) / "missing.toml")

    def test_parse_size(self) -> None:
        self.assertEqual(
            parse_size("/x.jpg\n  pixelWidth: 800\n  pixelHeight: 600\n"), (800, 600)
        )
        self.assertIsNone(parse_size("/x.jpg\n"))
        self.assertIsNone(parse_size("/x.jpg\n  pixelWidth: nil\n  pixelHeight: 600\n"))


if __name__ == "__main__":
    unittest.main()
