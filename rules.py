"""What counts as a laugh.

A laugh is a haha, heart, or sticker tapback, an emoji tapback whose emoji is not in BAD_EMOJI,
or a thread reply containing a laugh word: lol, lmao, or ha in any spelling, run-on, or keyboard
mash (LOL, LOLOLOL, LLLLOOL, lmaooo, hahaha, HAAHIOAJHA). Thumbs up, thumbs down, exclamation and
question tapbacks never count. Skin tones and variation selectors are ignored when matching emoji.
Removed reacts are not counted, a person laughing at their own message is not counted, and one
person laughing at one message counts once.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

TAPBACK_MIN = 2000
TAPBACK_MAX = 3999
REMOVED_TAPBACK_BASE = 3000
EMOJI_TAPBACK = 2006
TEXT_LAUGH = 2003
LAUGH_TAPBACKS = frozenset({2000, 2003, 2007})
TAPBACK_LABELS = {
    2000: "❤️",
    2001: "👍",
    2002: "👎",
    2003: "😂",
    2004: "‼️",
    2005: "❓",
    2007: "sticker",
}
SKIN_TONES = range(0x1F3FB, 0x1F400)
EMOJI_MODIFIERS = dict.fromkeys([0xFE0F, 0xFE0E, 0x20E3, 0x200D, *SKIN_TONES])
BAD_EMOJI = frozenset(
    {
        "👍",
        "👎",
        "❓",
        "❗",
        "‼",
        "❌",
        "😒",
        "💔",
        "😢",
        "😔",
        "🤨",
        "🤮",
        "🤢",
        "😐",
        "😑",
        "😡",
        "🙄",
        "💩",
        "🧢",
        "😬",
        "🥀",
    }
)
LAUGH_WORD = re.compile(r"[A-Za-z]+")
LOL_LETTERS = frozenset("lolzs")
LMAO_LETTERS = frozenset("lmfao")
LO_LETTERS = frozenset("lo")
HA_LETTERS = frozenset("ha")
HA_RATIO = 0.7
MIN_HA_COUNT = 2
SHORT_WORD = 3
MIN_LO_WORD = 4


@dataclass(frozen=True)
class Reaction:
    reactor: str
    target_guid: str
    sent_at: float
    is_add: bool
    kind: int
    emoji: str | None

    @property
    def label(self) -> str:
        base = self.kind % 1000 + TAPBACK_MIN
        if base == EMOJI_TAPBACK and self.emoji:
            return base_emoji(self.emoji)
        return TAPBACK_LABELS.get(base, "?")


def base_emoji(emoji: str) -> str:
    return emoji.translate(EMOJI_MODIFIERS)


def is_lol_word(word: str, letters: frozenset[str]) -> bool:
    if word.startswith("lol") and letters <= LOL_LETTERS:
        return True
    if word.startswith("lm") and "ao" in word and letters <= LMAO_LETTERS:
        return True
    return letters == LO_LETTERS and len(word) >= MIN_LO_WORD


def is_ha_word(word: str, letters: frozenset[str]) -> bool:
    if "ha" not in word:
        return False
    if letters <= HA_LETTERS:
        return True
    if len(word) <= SHORT_WORD:
        return False
    if word.count("h") < MIN_HA_COUNT or word.count("a") < MIN_HA_COUNT:
        return False
    return sum(c in HA_LETTERS for c in word) / len(word) >= HA_RATIO


def is_laugh_word(word: str) -> bool:
    letters = frozenset(word)
    return is_lol_word(word, letters) or is_ha_word(word, letters)


def is_laugh_text(text: str) -> bool:
    return any(is_laugh_word(word.lower()) for word in LAUGH_WORD.findall(text))


def is_laugh(kind: int, emoji: str | None) -> bool:
    if not TAPBACK_MIN <= kind <= TAPBACK_MAX:
        return False
    base = kind % 1000 + TAPBACK_MIN
    if base in LAUGH_TAPBACKS:
        return True
    return base == EMOJI_TAPBACK and base_emoji(emoji or "") not in BAD_EMOJI


def active_reactions(reactions: list[Reaction]) -> list[Reaction]:
    state: dict[tuple[str, str, str], Reaction] = {}
    for r in sorted(reactions, key=lambda r: r.sent_at):
        state[(r.reactor, r.target_guid, r.label)] = r
    return [r for r in state.values() if r.is_add]


def active_laughs(
    reactions: list[Reaction], author_by_guid: dict[str, str]
) -> list[tuple[str, str]]:
    laughed = {
        (r.reactor, r.target_guid)
        for r in active_reactions(reactions)
        if is_laugh(r.kind, r.emoji) and author_by_guid.get(r.target_guid) != r.reactor
    }
    return sorted(laughed)
