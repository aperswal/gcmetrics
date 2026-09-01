import type { ChatStats } from '@/lib/data';

export const sampleStats: ChatStats = {
  chat: 'BBC',
  generatedAt: '2026-09-01T06:00:00-0700',
  messageCount: 10,
  laughCount: 4,
  photo: { src: 'https://blob.example/photo.jpg', width: 256, height: 256 },
  mentionWord: 'fob',
  mentions: [
    { name: 'Sai', times: 9 },
    { name: 'Arun', times: 4 },
  ],
  perMessage: [{ name: 'Nitin', laughs: 75, messages: 117, perMessage: 0.641 }],
  funniest: [
    { laughs: 6, date: '2026-01-15', sender: 'Arun', text: 'lol', image: null },
    {
      laughs: 5,
      date: '2026-01-16',
      sender: 'Rakii',
      text: '',
      image: { src: 'https://blob.example/a.jpg', width: 800, height: 600 },
    },
  ],
  laughers: [{ name: 'Andrew', given: 909, favorite: 'haha' }],
};
