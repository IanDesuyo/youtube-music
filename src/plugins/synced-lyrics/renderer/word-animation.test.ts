import { expect, test } from '@playwright/test';

import { getWordAnimationState } from './word-animation';

const words = [
  { text: '沈', timeInMs: 1000, duration: 400 },
  { text: 'む', timeInMs: 1400, duration: 200 },
  { text: ' ', timeInMs: 1600, duration: 0 },
  { text: '声', timeInMs: 1800, duration: 400 },
];

test('calculates smooth progress for only the active word', () => {
  expect(getWordAnimationState(words, 1200)).toEqual({
    activeIndex: 0,
    completedIndex: -1,
    progress: 0.5,
  });
  expect(getWordAnimationState(words, 1500)).toEqual({
    activeIndex: 1,
    completedIndex: 0,
    progress: 0.5,
  });
});

test('handles gaps, zero-duration tokens, and backwards seeks', () => {
  expect(getWordAnimationState(words, 1700)).toEqual({
    activeIndex: -1,
    completedIndex: 2,
    progress: 0,
  });
  expect(getWordAnimationState(words, 2000)).toEqual({
    activeIndex: 3,
    completedIndex: 2,
    progress: 0.5,
  });
  expect(getWordAnimationState(words, 900)).toEqual({
    activeIndex: -1,
    completedIndex: -1,
    progress: 0,
  });
});
