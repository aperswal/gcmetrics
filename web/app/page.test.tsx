import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders the exported chats from the data directory', () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain('<h1 class="font-sketch text-5xl">Group chat stats</h1>');
  });
});
