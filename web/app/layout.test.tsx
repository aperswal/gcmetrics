import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RootLayout, { metadata } from '@/app/layout';

describe('RootLayout', () => {
  it('wraps children in an English html document', () => {
    const html = renderToStaticMarkup(<RootLayout>{'x'}</RootLayout>);
    expect(html).toBe(
      '<html lang="en" class="h-full antialiased"><head></head><body class="flex min-h-full flex-col">x</body></html>',
    );
  });

  it('sets the page title and description', () => {
    expect(metadata.title).toBe('Group chat stats');
    expect(metadata.description).toBe('Daily laugh leaderboards for your group chats');
  });
});
