import { describe, expect, it } from 'vitest';
import { sampleStats } from '@/lib/fixtures.test-helper';
import {
  OG_IMAGE_NAME,
  buildMetadata,
  robotsFor,
  siteDescription,
  siteTitle,
  sitemapFor,
} from '@/lib/seo';

const site = new URL('https://choppelgangers.com');
const two = [sampleStats, { ...sampleStats, chat: 'Other' }];

describe('og image name', () => {
  it('is og.png', () => {
    expect(OG_IMAGE_NAME).toBe('og.png');
  });
});

describe('titles', () => {
  it('names the chat when there is exactly one', () => {
    expect(siteTitle([sampleStats])).toBe('BBC laugh leaderboard');
    expect(siteDescription([{ ...sampleStats, messageCount: 3266 }])).toBe(
      'Who is the funniest in BBC? Laugh leaderboards from 3,266 messages, updated daily.',
    );
  });

  it('falls back to a generic title otherwise', () => {
    expect(siteTitle(two)).toBe('Group chat stats');
    expect(siteTitle([])).toBe('Group chat stats');
    expect(siteDescription(two)).toBe(
      'Who is the funniest in the group chat? Laugh leaderboards, updated daily.',
    );
  });
});

describe('buildMetadata', () => {
  it('includes canonical url, images, and cards when everything is available', () => {
    expect(buildMetadata([sampleStats], site, true)).toEqual({
      title: 'BBC laugh leaderboard',
      description:
        'Who is the funniest in BBC? Laugh leaderboards from 10 messages, updated daily.',
      metadataBase: site,
      alternates: { canonical: '/' },
      icons: { icon: '/icon.png', apple: '/apple-icon.png' },
      openGraph: {
        title: 'BBC laugh leaderboard',
        description:
          'Who is the funniest in BBC? Laugh leaderboards from 10 messages, updated daily.',
        type: 'website',
        siteName: 'BBC laugh leaderboard',
        images: [{ url: '/og.png', width: 1200, height: 630, alt: 'BBC laugh leaderboard' }],
      },
      twitter: {
        title: 'BBC laugh leaderboard',
        description:
          'Who is the funniest in BBC? Laugh leaderboards from 10 messages, updated daily.',
        card: 'summary_large_image',
        images: ['/og.png'],
      },
      robots: { index: true, follow: true },
    });
  });

  it('leaves out urls and images when they are missing', () => {
    expect(buildMetadata(two, null, false)).toEqual({
      title: 'Group chat stats',
      description: 'Who is the funniest in the group chat? Laugh leaderboards, updated daily.',
      icons: undefined,
      openGraph: {
        title: 'Group chat stats',
        description: 'Who is the funniest in the group chat? Laugh leaderboards, updated daily.',
        type: 'website',
        siteName: 'Group chat stats',
      },
      twitter: {
        title: 'Group chat stats',
        description: 'Who is the funniest in the group chat? Laugh leaderboards, updated daily.',
        card: 'summary',
      },
      robots: { index: true, follow: true },
    });
  });
});

describe('robots and sitemap', () => {
  it('point at the sitemap and home page when the site url is known', () => {
    expect(robotsFor(site)).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: 'https://choppelgangers.com/sitemap.xml',
    });
    expect(sitemapFor(site)).toEqual([
      { url: 'https://choppelgangers.com/', changeFrequency: 'daily', priority: 1 },
    ]);
  });

  it('degrade without a site url', () => {
    expect(robotsFor(null)).toEqual({ rules: { userAgent: '*', allow: '/' } });
    expect(sitemapFor(null)).toEqual([]);
  });
});
