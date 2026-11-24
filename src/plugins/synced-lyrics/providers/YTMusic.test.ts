import { expect, test } from '@playwright/test';

import { isValidYouTubeVideoId } from './YTMusic';

test('accepts only complete YouTube video IDs', () => {
  expect(isValidYouTubeVideoId('by4SYYWlhEs')).toBe(true);
  expect(isValidYouTubeVideoId('')).toBe(false);
  expect(isValidYouTubeVideoId('too-short')).toBe(false);
  expect(isValidYouTubeVideoId('bad/id/value')).toBe(false);
});
