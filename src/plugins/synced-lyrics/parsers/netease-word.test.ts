import { expect, test } from '@playwright/test';

import { parseNetEaseKLyric, parseNetEaseYrc } from './netease-word';

test('parses NetEase YRC absolute word timestamps', () => {
  const lines = parseNetEaseYrc(
    '[59610,1950](59610,450,0)In (60060,420,0)my (60480,1080,0)dream',
  );

  expect(lines.at(-1)).toMatchObject({
    timeInMs: 59610,
    duration: 1950,
    text: 'In my dream',
    words: [
      { text: 'In ', timeInMs: 59610, duration: 450 },
      { text: 'my ', timeInMs: 60060, duration: 420 },
      { text: 'dream', timeInMs: 60480, duration: 1080 },
    ],
  });
});

test('parses NetEase K-Lyric cumulative word durations', () => {
  const lines = parseNetEaseKLyric('[1000,900](0,300)夜(0,200)に(0,400)駆ける');

  expect(lines.at(-1)?.words).toEqual([
    { text: '夜', timeInMs: 1000, duration: 300 },
    { text: 'に', timeInMs: 1300, duration: 200 },
    { text: '駆ける', timeInMs: 1500, duration: 400 },
  ]);
});
