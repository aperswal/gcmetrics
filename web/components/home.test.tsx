import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Home } from '@/components/home';
import { sampleStats } from '@/lib/fixtures.test-helper';

describe('Home', () => {
  it('renders a card for every chat', () => {
    const html = renderToStaticMarkup(
      <Home chats={[sampleStats, { ...sampleStats, chat: 'Zeta' }]} />,
    );
    expect(html).toContain('<h1 class="font-sketch text-5xl">Group chat stats</h1>');
    expect(html).toContain('class="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-8"');
    expect(html).toContain('>BBC</h2>');
    expect(html).toContain('>Zeta</h2>');
    expect(html).not.toContain('No chats exported yet');
  });

  it('explains what to do when nothing is exported', () => {
    const html = renderToStaticMarkup(<Home chats={[]} />);
    expect(html).toContain(
      '<p class="text-muted-foreground">No chats exported yet. Run uv run export.py first.</p>',
    );
    expect(html).not.toContain('</header>');
  });
});
