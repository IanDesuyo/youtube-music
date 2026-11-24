import { expect, test } from '@playwright/test';

import { getLyricsScrollTarget } from './lyrics-scroll';

test('resets to the top when the next song has not reached its first line', () => {
  expect(
    getLyricsScrollTarget(
      Array.from({ length: 20 }, () => 'upcoming' as const),
      50,
    ),
  ).toEqual({ index: 0, align: 'start', smooth: false });
});

test('keeps centering the active line during normal playback', () => {
  expect(
    getLyricsScrollTarget(['previous', 'previous', 'current', 'upcoming'], 1),
  ).toEqual({ index: 3, align: 'center', smooth: true });
});
