import { describe, expect, it } from 'vitest';
import { env, parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('builds the site url from the Vercel production host', () => {
    expect(parseEnv({ VERCEL_PROJECT_PRODUCTION_URL: 'choppelgangers.com' }).siteUrl?.href).toBe(
      'https://choppelgangers.com/',
    );
  });

  it('has no site url outside Vercel', () => {
    expect(parseEnv({}).siteUrl).toBeNull();
    expect(() => parseEnv({ VERCEL_PROJECT_PRODUCTION_URL: '' })).toThrow();
  });

  it('exposes the parsed process environment', () => {
    expect(env.siteUrl === null || env.siteUrl instanceof URL).toBe(true);
  });
});
