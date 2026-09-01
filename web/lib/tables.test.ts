import { describe, expect, it } from 'vitest';
import { sampleStats } from '@/lib/fixtures.test-helper';
import {
  chatTables,
  funniestTable,
  laughersTable,
  mentionsTable,
  perMessageTable,
} from '@/lib/tables';

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
      badges: { column: 1, first: 'clown', last: 'get yo shit together' },
    });
  });

  it('builds the funniest-messages table with message cells', () => {
    expect(funniestTable(sampleStats)).toEqual({
      title: 'Most liked messages',
      headers: ['#', 'Laughs', 'Date', 'Sender', 'Message'],
      badges: { column: 3, first: 'Aura farmer' },
      rows: [
        [1, 6, '2026-01-15', 'Arun', { text: 'lol', image: null, sender: 'Arun' }],
        [
          2,
          5,
          '2026-01-16',
          'Rakii',
          {
            text: '',
            image: { src: 'https://blob.example/a.jpg', width: 800, height: 600 },
            sender: 'Rakii',
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
      badges: { column: 1, first: 'do you not have a job?' },
    });
  });

  it('orders the tables mentions, per message, funniest, laughers', () => {
    expect(chatTables(sampleStats).map((table) => table.title)).toEqual([
      'Most called fob',
      'Funniest per message',
      'Most liked messages',
      'Laughs the most',
    ]);
  });

  it('drops the mentions table when there is no word', () => {
    expect(chatTables({ ...sampleStats, mentionWord: null }).map((table) => table.title)).toEqual([
      'Funniest per message',
      'Most liked messages',
      'Laughs the most',
    ]);
  });
});
