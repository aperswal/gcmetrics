import type { ReactElement } from 'react';
import { ChatCard } from '@/components/chat-card';
import type { ChatStats } from '@/lib/data';

export function Home({ chats }: { chats: ChatStats[] }): ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-8">
      <h1 className="font-sketch text-5xl">Group chat stats</h1>
      {chats.length === 0 ? (
        <p className="text-muted-foreground">No chats exported yet. Run uv run export.py first.</p>
      ) : null}
      {chats.map((stats) => (
        <ChatCard key={stats.chat} stats={stats} />
      ))}
    </main>
  );
}
