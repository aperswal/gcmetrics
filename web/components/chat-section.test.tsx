import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChatSection, count } from '@/components/chat-section';
import { sampleStats } from '@/lib/fixtures.test-helper';

describe('count', () => {
  it('pluralizes and groups thousands', () => {
    expect(count(1, 'message')).toBe('1 message');
    expect(count(0, 'laugh')).toBe('0 laughs');
    expect(count(3266, 'message')).toBe('3,266 messages');
  });
});

describe('ChatSection', () => {
  const html = renderToStaticMarkup(<ChatSection stats={sampleStats} />);

  it('renders the chat name, photo, and summary line', () => {
    expect(html).toContain('<h2 class="font-sketch text-4xl">BBC</h2>');
    expect(html).toContain('alt="BBC group photo"');
    expect(html).toContain('src="https://blob.example/photo.jpg"');
    expect(html).toContain('width="64"');
    expect(html).toContain('class="size-16 shrink-0 rounded-full object-cover"');
    expect(html).toContain('10 messages, 4 laughs. Updated 2026-09-01.');
  });

  it('stacks every table full width with a divider before each one', () => {
    expect(html).toContain(
      '<section class="flex flex-col gap-8"><header class="flex items-center gap-4">',
    );
    expect(html.match(/<\/header><div class="flex flex-col gap-8"><hr\/>/g)).toHaveLength(1);
    expect(html.match(/<div class="flex flex-col gap-8"><hr\/><div><h3/g)).toHaveLength(4);
    expect(html.match(/<h3/g)).toHaveLength(4);
    expect(html).not.toContain('grid');
  });

  it('falls back to the first character when there is no photo, keeping emoji whole', () => {
    const fallback = renderToStaticMarkup(
      <ChatSection stats={{ ...sampleStats, photo: null, chat: '\u{1F355} pizza' }} />,
    );
    expect(fallback).toContain(
      '<div class="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-bold">\u{1F355}</div>',
    );
    expect(fallback).not.toContain('group photo');
    const blank = renderToStaticMarkup(
      <ChatSection stats={{ ...sampleStats, photo: null, chat: '' }} />,
    );
    expect(blank).toContain('text-2xl font-bold"></div>');
  });
});
