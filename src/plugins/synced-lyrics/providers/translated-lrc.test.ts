import { expect, test } from '@playwright/test';

import { parseTranslatedLrc } from './translated-lrc';

test('merges translations with matching timestamps', () => {
  const lines = parseTranslatedLrc(
    '[00:01.00]沈むように\n[00:05.00]夜に駆ける',
    '[00:01.00]彷彿下沉一般\n[00:05.00]奔向夜晚',
  );

  expect(
    lines.slice(1).map(({ text, translation }) => ({ text, translation })),
  ).toStrictEqual([
    { text: '沈むように', translation: '彷彿下沉一般' },
    { text: '夜に駆ける', translation: '奔向夜晚' },
  ]);
});

test('accepts small timestamp drift but does not merge another line', () => {
  const lines = parseTranslatedLrc(
    '[00:01.00]first\n[00:02.00]second',
    '[00:01.20]第一行\n[00:02.50]不應合併',
  );

  expect(lines.slice(1).map(({ translation }) => translation)).toStrictEqual([
    '第一行',
    undefined,
  ]);
});
