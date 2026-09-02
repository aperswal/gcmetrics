import { z } from 'zod';

const schema = z.object({ VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional() });

export interface Env {
  siteUrl: URL | null;
}

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const parsed = schema.parse(raw);
  const host = parsed.VERCEL_PROJECT_PRODUCTION_URL;
  return { siteUrl: host === undefined ? null : new URL(`https://${host}`) };
}

export const env = parseEnv(process.env);
