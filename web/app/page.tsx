import type { ReactElement } from 'react';
import { Home } from '@/components/home';
import { loadChats } from '@/lib/data';

export default function HomePage(): ReactElement {
  return <Home chats={loadChats()} />;
}
