import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { DataError } from '@/lib/errors';

const imageSchema = z.object({ src: z.string(), width: z.number(), height: z.number() }).nullable();

const chatStatsSchema = z.object({
  chat: z.string(),
  generatedAt: z.string(),
  messageCount: z.number(),
  laughCount: z.number(),
  photo: imageSchema,
  mentionWord: z.string().nullable(),
  mentions: z.array(z.object({ name: z.string(), times: z.number() })),
  perMessage: z.array(
    z.object({
      name: z.string(),
      laughs: z.number(),
      messages: z.number(),
      perMessage: z.number(),
    }),
  ),
  funniest: z.array(
    z.object({
      laughs: z.number(),
      date: z.string(),
      sender: z.string(),
      text: z.string(),
      image: imageSchema,
    }),
  ),
  laughers: z.array(z.object({ name: z.string(), given: z.number(), favorite: z.string() })),
});

export type ChatStats = z.infer<typeof chatStatsSchema>;
export type ImageRef = NonNullable<ChatStats['photo']>;

export function parseChatStats(input: unknown, source: string): ChatStats {
  const result = chatStatsSchema.safeParse(input);
  if (!result.success) {
    throw new DataError(`${source}: ${result.error.message}`);
  }
  return result.data;
}

export function sortChats(chats: ChatStats[]): ChatStats[] {
  const names = new Set(chats.map((chat) => chat.chat));
  if (names.size !== chats.length) {
    throw new DataError('two exported files share the same chat name');
  }
  const collator = new Intl.Collator('en', { sensitivity: 'base' });
  return [...chats].sort((a, b) => collator.compare(a.chat, b.chat));
}

function readJson(path: string): unknown {
  try {
    const value: unknown = JSON.parse(readFileSync(path).toString());
    return value;
  } catch (error) {
    throw new DataError(`${path}: ${String(error)}`);
  }
}

export function loadChats(dir: string = join(process.cwd(), 'data')): ChatStats[] {
  if (!existsSync(dir)) {
    return [];
  }
  const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
  return sortChats(files.map((name) => parseChatStats(readJson(join(dir, name)), name)));
}
