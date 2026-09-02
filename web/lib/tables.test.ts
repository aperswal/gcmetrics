import { describe, expect, it } from 'vitest';
import { sampleStats } from '@/lib/fixtures.test-helper';
import {
  AURA_FARMER,
  CLOWN,
  GET_IT_TOGETHER,
  NO_JOB,
  VOLUME_SHOOTER,
  chatTables,
  funniestTable,
  laughersTable,
  mentionsTable,
  mostLaughsTable,
  perMessageTable,
} from '@/lib/tables';

describe('badges', () => {
  it('define text, emoji, and a color class', () => {
    expect(CLOWN).toEqual({
      text: 'clown',
      emoji: String.fromCodePoint(0x1f921),
      className: 'text-pink-600',
    });
    expect(GET_IT_TOGETHER).toEqual({
      text: 'get yo shit together',
      emoji: String.fromCodePoint(0x1f480),
      className: 'text-red-600',
    });
    expect(AURA_FARMER).toEqual({
      text: 'Aura farmer',
      emoji: String.fromCodePoint(0x2728),
      className: 'text-violet-600',
    });
    expect(VOLUME_SHOOTER).toEqual({
      text: 'volume shooter',
      emoji: String.fromCodePoint(0x1f3c0),
      className: 'text-orange-600',
    });
    expect(NO_JOB).toEqual({
      text: 'do you not have a job?',
      emoji: String.fromCodePoint(0x1f4bc),
      className: 'text-amber-600',
    });
  });
});

describe('tables', () => {
  it('builds the mentions table with ranks', () => {
    expect(mentionsTable(sampleStats)).toEqual({
      title: 'Most called fob',
      headers: ['#', 'Name', 'Times'],
      rows: [
        [1, 'Sai', 9],
        [2, 'Arun', 4],
      ],
    });
  });

  it('omits the mentions table when no word is configured', () => {
    expect(mentionsTable({ ...sampleStats, mentionWord: null })).toBeNull();
  });

  it('builds the per-message table with the rate as a number', () => {
    expect(perMessageTable(sampleStats)).toEqual({
      title: 'Funniest per message',
      headers: ['#', 'Name', 'Per msg', 'Laughs', 'Msgs'],
      rows: [[1, 'Nitin', 0.641, 75, 117]],
      badges: { column: 1, first: CLOWN, last: GET_IT_TOGETHER },
    });
  });

  it('ranks people by total laughs without mutating the input', () => {
    const perMessage = [
      { name: 'Low', laughs: 2, messages: 1, perMessage: 2 },
      { name: 'High', laughs: 9, messages: 30, perMessage: 0.3 },
      { name: 'Mid', laughs: 5, messages: 5, perMessage: 1 },
    ];
    expect(mostLaughsTable({ ...sampleStats, perMessage })).toEqual({
      title: 'Most funny messages',
      headers: ['#', 'Name', 'Laughs', 'Msgs'],
      rows: [
        [1, 'High', 9, 30],
        [2, 'Mid', 5, 5],
        [3, 'Low', 2, 1],
      ],
      badges: { column: 1, first: VOLUME_SHOOTER },
    });
    expect(perMessage.map((row) => row.name)).toEqual(['Low', 'High', 'Mid']);
  });

  it('builds the funniest-messages table with message cells', () => {
    expect(funniestTable(sampleStats)).toEqual({
      title: 'Most liked messages',
      headers: ['#', 'Laughs', 'Date', 'Sender', 'Message'],
      badges: { column: 3, first: AURA_FARMER },
      hiddenOnMobile: [2, 3],
      rows: [
        [
          1,
          6,
          '2026-01-15',
          'Arun',
          { text: 'lol', image: null, sender: 'Arun', date: '2026-01-15' },
        ],
        [
          2,
          5,
          '2026-01-16',
          'Rakii',
          {
            text: '',
            image: { src: 'https://blob.example/a.jpg', width: 800, height: 600 },
            sender: 'Rakii',
            date: '2026-01-16',
          },
        ],
      ],
    });
  });

  it('builds the laughers table with the favorite reaction', () => {
    expect(laughersTable(sampleStats)).toEqual({
      title: 'Laughs the most',
      headers: ['#', 'Name', 'Laughs given', 'Most common reaction'],
      rows: [[1, 'Andrew', 909, 'haha']],
      badges: { column: 1, first: NO_JOB },
      centered: [3],
    });
  });

  it('orders the tables mentions, per message, funniest, laughers', () => {
    expect(chatTables(sampleStats).map((table) => table.title)).toEqual([
      'Most called fob',
      'Funniest per message',
      'Most funny messages',
      'Most liked messages',
      'Laughs the most',
    ]);
  });

  it('drops the mentions table when there is no word', () => {
    expect(chatTables({ ...sampleStats, mentionWord: null }).map((table) => table.title)).toEqual([
      'Funniest per message',
      'Most funny messages',
      'Most liked messages',
      'Laughs the most',
    ]);
  });
});
