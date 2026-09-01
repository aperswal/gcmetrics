import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import 'drawably/style.css';
import 'drawably/font.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Group chat stats',
  description: 'Daily laugh leaderboards for your group chats',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
