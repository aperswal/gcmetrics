import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadChats, parseChatStats, sortChats } from '@/lib/data';
import { DataError } from '@/lib/errors';
import { sampleStats } from '@/lib/fixtures.test-helper';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'gcmetrics-'));
}

describe('parseChatStats', () => {
  it('rejects malformed input with a DataError naming the source', () => {
    expect(() => parseChatStats({ chat: 'x' }, 'bad.json')).toThrow(DataError);
    expect(() => parseChatStats({ chat: 'x' }, 'bad.json')).toThrow(/^bad\.json: /);
    expect(() => parseChatStats({ chat: 'x' }, 'bad.json')).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
  });

  it('returns the parsed object for valid input', () => {
    expect(parseChatStats(sampleStats, 'ok.json')).toEqual(sampleStats);
  });
});

describe('sortChats', () => {
  it('orders chats by name ignoring case and accents without mutating the input', () => {
    const input = ['zeta', '\u00c9mile', 'apple', 'Beta'].map((chat) => ({ ...sampleStats, chat }));
    expect(sortChats(input).map((chat) => chat.chat)).toEqual([
      'apple',
      'Beta',
      '\u00c9mile',
      'zeta',
    ]);
    expect(input.map((chat) => chat.chat)).toEqual(['zeta', '\u00c9mile', 'apple', 'Beta']);
  });

  it('keeps equal-ignoring-case names in their original order', () => {
    const input = ['A', 'a'].map((chat) => ({ ...sampleStats, chat }));
    expect(sortChats(input).map((chat) => chat.chat)).toEqual(['A', 'a']);
  });

  it('rejects two chats with the same name', () => {
    const twice = [sampleStats, { ...sampleStats }];
    expect(() => sortChats(twice)).toThrow(
      new DataError('two exported files share the same chat name'),
    );
  });
});

describe('loadChats', () => {
  it('reads only json files from a directory, sorted by chat name', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'z.json'), JSON.stringify({ ...sampleStats, chat: 'Zeta' }));
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ ...sampleStats, chat: 'Alpha' }));
    writeFileSync(join(dir, 'notes.txt'), 'ignore me');
    expect(loadChats(dir).map((chat) => chat.chat)).toEqual(['Alpha', 'Zeta']);
  });

  it('names the file when its JSON is corrupt or does not match the schema', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'broken.json'), '{bad');
    expect(() => loadChats(dir)).toThrow(DataError);
    expect(() => loadChats(dir)).toThrow(/broken\.json: SyntaxError/);
    writeFileSync(join(dir, 'broken.json'), JSON.stringify({ chat: 'x' }));
    expect(() => loadChats(dir)).toThrow(/^broken\.json: /);
  });

  it('returns nothing when the directory does not exist', () => {
    expect(loadChats(join(tmpdir(), 'gcmetrics-missing-dir'))).toEqual([]);
  });

  it('reads the data directory by default without throwing', () => {
    expect(Array.isArray(loadChats())).toBe(true);
  });
});
