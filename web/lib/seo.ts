import type { Metadata, MetadataRoute } from 'next';
import type { ChatStats } from '@/lib/data';

export const OG_IMAGE_PATH = 'public/og.png';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export function siteTitle(chats: ChatStats[]): string {
  const only = chats.length === 1 ? chats[0] : undefined;
  return only === undefined ? 'Group chat stats' : `${only.chat} laugh leaderboard`;
}

export function siteDescription(chats: ChatStats[]): string {
  const only = chats.length === 1 ? chats[0] : undefined;
  if (only === undefined) {
    return 'Who is the funniest in the group chat? Laugh leaderboards, updated daily.';
  }
  return `Who is the funniest in ${only.chat}? Laugh leaderboards from ${only.messageCount.toLocaleString('en-US')} messages, updated daily.`;
}

function imageMetadata(
  title: string,
  hasImages: boolean,
): Pick<Metadata, 'icons' | 'openGraph' | 'twitter'> {
  if (!hasImages) {
    return { openGraph: {}, twitter: { card: 'summary' } };
  }
  return {
    icons: { icon: '/icon.png', apple: '/apple-icon.png' },
    openGraph: { images: [{ url: '/og.png', width: OG_WIDTH, height: OG_HEIGHT, alt: title }] },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
  };
}

export function buildMetadata(
  chats: ChatStats[],
  siteUrl: URL | null,
  hasImages: boolean,
): Metadata {
  const title = siteTitle(chats);
  const description = siteDescription(chats);
  const images = imageMetadata(title, hasImages);
  return {
    title,
    description,
    ...(siteUrl === null ? {} : { metadataBase: siteUrl, alternates: { canonical: '/' } }),
    icons: images.icons,
    openGraph: { title, description, type: 'website', siteName: title, ...images.openGraph },
    twitter: { title, description, ...images.twitter },
    robots: { index: true, follow: true },
  };
}

export function robotsFor(siteUrl: URL | null): MetadataRoute.Robots {
  const rules = { userAgent: '*', allow: '/' };
  return siteUrl === null ? { rules } : { rules, sitemap: new URL('/sitemap.xml', siteUrl).href };
}

export function sitemapFor(siteUrl: URL | null): MetadataRoute.Sitemap {
  return siteUrl === null ? [] : [{ url: siteUrl.href, changeFrequency: 'daily', priority: 1 }];
}
