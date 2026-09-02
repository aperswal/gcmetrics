import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('robots and sitemap routes', () => {
  it('allow crawling and list at most the home page', () => {
    expect(robots().rules).toEqual({ userAgent: '*', allow: '/' });
    expect(sitemap().length).toBeLessThanOrEqual(1);
  });
});
