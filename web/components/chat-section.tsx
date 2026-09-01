import Image from 'next/image';
import type { ReactElement } from 'react';
import { DrawablyDivider } from '@/components/sketch';
import { StatTable } from '@/components/stat-table';
import type { ChatStats } from '@/lib/data';
import { chatTables } from '@/lib/tables';

const DATE_LENGTH = 10;
const PHOTO_SIZE = 64;

export function count(n: number, noun: string): string {
  return `${n.toLocaleString('en-US')} ${noun}${n === 1 ? '' : 's'}`;
}

function ChatPhoto({ stats }: { stats: ChatStats }): ReactElement {
  if (stats.photo === null) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-bold">
        {Array.from(stats.chat)[0] ?? ''}
      </div>
    );
  }
  return (
    <Image
      src={stats.photo.src}
      width={PHOTO_SIZE}
      height={PHOTO_SIZE}
      alt={`${stats.chat} group photo`}
      className="size-16 shrink-0 rounded-full object-cover"
      unoptimized
    />
  );
}

export function ChatSection({ stats }: { stats: ChatStats }): ReactElement {
  return (
    <section className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <ChatPhoto stats={stats} />
        <div>
          <h2 className="font-sketch text-4xl">{stats.chat}</h2>
          <p className="text-sm text-muted-foreground">
            {count(stats.messageCount, 'message')}, {count(stats.laughCount, 'laugh')}. Updated{' '}
            {stats.generatedAt.slice(0, DATE_LENGTH)}.
          </p>
        </div>
      </header>
      {chatTables(stats).map((model) => (
        <div key={model.title} className="flex flex-col gap-8">
          <DrawablyDivider />
          <StatTable model={model} />
        </div>
      ))}
    </section>
  );
}
