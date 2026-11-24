import { expect, test } from '@playwright/test';

import { getEffectiveLyricsTime, getOffsetSeekTime } from './timing-offset';

test('positive offset delays lyric activation and seeking', () => {
  expect(getEffectiveLyricsTime(1200, 200)).toBe(1000);
  expect(getOffsetSeekTime(1000, 200)).toBe(1200);
});

test('negative seek offsets never seek before zero', () => {
  expect(getOffsetSeekTime(50, -100)).toBe(0);
});
