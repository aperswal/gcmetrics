import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { loadChats } from '@/lib/data';
import { env } from '@/lib/env';
import { OG_IMAGE_NAME, buildMetadata } from '@/lib/seo';
import 'drawably/style.css';
import 'drawably/font.css';
import './globals.css';

export function generateMetadata(): Metadata {
  const hasImages = existsSync(join(process.cwd(), 'public', OG_IMAGE_NAME));
  return buildMetadata(loadChats(), env.siteUrl, hasImages);
}

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
