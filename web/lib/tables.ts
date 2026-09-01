import type { ChatStats, ImageRef } from '@/lib/data';

export interface MessageCell {
  text: string;
  image: ImageRef | null;
  sender: string;
}

export type Cell = string | number | MessageCell;

export interface Badges {
  column: number;
  first?: string;
  last?: string;
}

export interface TableModel {
  title: string;
  headers: string[];
  rows: Cell[][];
  badges?: Badges;
}

const NAME_COLUMN = 1;
const SENDER_COLUMN = 3;

function ranked(rows: Cell[][]): Cell[][] {
  return rows.map((row, index) => [index + 1, ...row]);
}

export function mentionsTable(stats: ChatStats): TableModel | null {
  if (stats.mentionWord === null) {
    return null;
  }
  return {
    title: `Most called ${stats.mentionWord}`,
    headers: ['#', 'Name', 'Times'],
    rows: ranked(stats.mentions.map((row) => [row.name, row.times])),
  };
}

export function perMessageTable(stats: ChatStats): TableModel {
  return {
    title: 'Funniest per message',
    headers: ['#', 'Name', 'Per msg', 'Laughs', 'Msgs'],
    rows: ranked(
      stats.perMessage.map((row) => [row.name, row.perMessage, row.laughs, row.messages]),
    ),
    badges: { column: NAME_COLUMN, first: 'clown', last: 'get yo shit together' },
  };
}

export function funniestTable(stats: ChatStats): TableModel {
  return {
    title: 'Most liked messages',
    headers: ['#', 'Laughs', 'Date', 'Sender', 'Message'],
    badges: { column: SENDER_COLUMN, first: 'Aura farmer' },
    rows: ranked(
      stats.funniest.map((row) => [
        row.laughs,
        row.date,
        row.sender,
        { text: row.text, image: row.image, sender: row.sender },
      ]),
    ),
  };
}

export function laughersTable(stats: ChatStats): TableModel {
  return {
    title: 'Laughs the most',
    headers: ['#', 'Name', 'Laughs given', 'Most common reaction'],
    rows: ranked(stats.laughers.map((row) => [row.name, row.given, row.favorite])),
    badges: { column: NAME_COLUMN, first: 'do you not have a job?' },
  };
}

export function chatTables(stats: ChatStats): TableModel[] {
  const tables = [perMessageTable(stats), funniestTable(stats), laughersTable(stats)];
  const mentions = mentionsTable(stats);
  return mentions === null ? tables : [mentions, ...tables];
}
