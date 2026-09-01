import type { ChatStats, ImageRef } from '@/lib/data';

export interface MessageCell {
  text: string;
  image: ImageRef | null;
  sender: string;
}

export type Cell = string | number | MessageCell;

export interface TableModel {
  title: string;
  headers: string[];
  rows: Cell[][];
}

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
  };
}

export function funniestTable(stats: ChatStats): TableModel {
  return {
    title: 'Funniest messages',
    headers: ['#', 'Laughs', 'Date', 'Sender', 'Message'],
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
  };
}

export function chatTables(stats: ChatStats): TableModel[] {
  const tables = [perMessageTable(stats), funniestTable(stats), laughersTable(stats)];
  const mentions = mentionsTable(stats);
  return mentions === null ? tables : [mentions, ...tables];
}
