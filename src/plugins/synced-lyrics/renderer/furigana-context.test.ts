import { expect, test } from '@playwright/test';

import { shouldFuriganizeToken } from './furigana-context';

test('furiganizes a leading kanji token using the full Japanese line as context', () => {
  expect(shouldFuriganizeToken('晩', '晩餐歌を歌う')).toBe(true);
  expect(shouldFuriganizeToken('餐', '晩餐歌を歌う')).toBe(true);
});

test('does not assume isolated Chinese lyrics are Japanese', () => {
  expect(shouldFuriganizeToken('晚', '晚餐时唱歌')).toBe(false);
});
