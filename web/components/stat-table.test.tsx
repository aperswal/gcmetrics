import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StatTable } from '@/components/stat-table';

describe('StatTable', () => {
  const html = renderToStaticMarkup(
    <StatTable
      model={{
        title: 'T',
        headers: ['#', 'Name', 'N', 'Rate', 'Message'],
        rows: [
          [1, 'Sai', 9, 0.641, { text: 'hello there', image: null, sender: 'Sai' }],
          [
            2,
            'Rakii',
            3,
            1,
            {
              text: '',
              image: { src: 'https://blob.example/a.jpg', width: 800, height: 600 },
              sender: 'Rakii',
            },
          ],
          [3, 'Nitin', 0, 2.5, { text: '', image: null, sender: 'Nitin' }],
        ],
      }}
    />,
  );

  it('renders the title, headers, and accessible names', () => {
    expect(html).toMatch(
      /<div><h3 id="([^"]+)" class="font-sketch mb-3 text-2xl">T<\/h3><div[^>]*><table[^>]*aria-labelledby="\1"/,
    );
    expect(html).toContain('scope="col" aria-label="Rank">#</th>');
    expect(html).toMatch(/<th[^>]*scope="col">Name<\/th>/);
    expect(html).not.toContain('aria-label="Name"');
  });

  it('right-aligns numbers, formats rates, and left-aligns text', () => {
    expect(html).toMatch(/<td[^>]*class="[^"]*text-right tabular-nums"[^>]*>9<\/td>/);
    expect(html).toMatch(/<td[^>]*class="[^"]*text-right tabular-nums"[^>]*>0\.641<\/td>/);
    expect(html).toMatch(/<td[^>]*class="[^"]*text-right tabular-nums"[^>]*>1<\/td>/);
    expect(html).toMatch(/<td[^>]*class="[^"]*text-right tabular-nums"[^>]*>2\.500<\/td>/);
    expect(html).toMatch(/<td[^>]*class="[^"]*text-left"[^>]*>Sai<\/td>/);
    expect(html).not.toContain('75.000');
  });

  it('wraps message text, shows images, and labels bare attachments', () => {
    expect(html).toContain(
      '<div class="flex max-w-md flex-col gap-2 whitespace-normal wrap-anywhere"><span>hello there</span></div>',
    );
    expect(html).toContain('alt="Image sent by Rakii"');
    expect(html).toContain('src="https://blob.example/a.jpg"');
    expect(html).toContain('class="h-auto max-w-xs rounded-md"');
    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
    expect(html).toContain('<span class="text-muted-foreground">Attachment</span>');
    expect(html).not.toContain('<span></span>');
    expect(html).not.toContain('ml-2');
    expect(html.match(/Attachment/g)).toHaveLength(1);
  });

  it('puts badges on the first and last row of the badge column only', () => {
    const badged = renderToStaticMarkup(
      <StatTable
        model={{
          title: 'B',
          headers: ['#', 'Name', 'N'],
          rows: [
            [1, 'Top', 9],
            [2, 'Mid', 5],
            [3, 'Low', 1],
          ],
          badges: { column: 1, first: 'clown', last: 'get yo shit together' },
        }}
      />,
    );
    expect(badged).toMatch(
      />Top<span[^>]*class="ml-2 whitespace-nowrap text-xs"[^>]*>clown<\/span>/,
    );
    expect(badged).toMatch(/>Low<span[^>]*>get yo shit together<\/span>/);
    expect(badged).toMatch(/>Mid<\/td>/);
    expect(badged).toMatch(/>9<\/td>/);
    expect(badged.match(/<span/g)).toHaveLength(2);
    const single = renderToStaticMarkup(
      <StatTable
        model={{
          title: 'S',
          headers: ['#', 'Name'],
          rows: [[1, 'Only']],
          badges: { column: 1, first: 'clown', last: 'get yo shit together' },
        }}
      />,
    );
    expect(single).toMatch(/>Only<span[^>]*>clown<\/span>/);
    expect(single).not.toContain('get yo shit together');
    const firstOnly = renderToStaticMarkup(
      <StatTable
        model={{
          title: 'F',
          headers: ['#', 'Name'],
          rows: [
            [1, 'A'],
            [2, 'B'],
          ],
          badges: { column: 1, first: 'volume shooter' },
        }}
      />,
    );
    expect(firstOnly).toMatch(/>A<span[^>]*>volume shooter<\/span>/);
    expect(firstOnly).toMatch(/>B<\/td>/);
  });

  it('shows a placeholder instead of an empty table', () => {
    const empty = renderToStaticMarkup(
      <StatTable model={{ title: 'Empty', headers: ['#', 'Name'], rows: [] }} />,
    );
    expect(empty).toContain('<p class="text-sm text-muted-foreground">Nothing yet.</p>');
    expect(empty).not.toContain('<table');
  });
});
