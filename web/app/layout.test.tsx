import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import RootLayout, { generateMetadata } from '@/app/layout';

describe('RootLayout', () => {
  it('wraps children in an English html document', () => {
    const html = renderToStaticMarkup(<RootLayout>{'x'}</RootLayout>);
    expect(html).toBe(
      '<html lang="en" class="h-full antialiased"><head></head><body class="flex min-h-full flex-col">x</body></html>',
    );
  });

  it('builds metadata from the exported chats', () => {
    const metadata = generateMetadata();
    expect(typeof metadata.title).toBe('string');
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.icons !== undefined).toBe(existsSync('public/og.png'));
  });
});
