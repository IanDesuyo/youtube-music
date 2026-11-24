import { expect, test } from '@playwright/test';

import { extractQrcContent, parseQrc } from './qrc';

test('extracts lyric content from QQ Music XML', () => {
  const xml =
    '<?xml version="1.0"?><Lyric_1 LyricContent="[ti:test]&#10;[1000,900]夜(1000,300)に(1300,200)駆ける(1500,400)"/>';

  expect(extractQrcContent(xml)).toBe(
    '[ti:test]\n[1000,900]夜(1000,300)に(1300,200)駆ける(1500,400)',
  );
});

test('parses QRC word timing', () => {
  const lines = parseQrc(
    '[offset:50]\n[1000,900]夜(1000,300)に(1300,200)駆ける(1500,400)',
  );

  expect(lines).toStrictEqual([
    {
      duration: 1050,
      status: 'upcoming',
      text: '',
      time: '00:00.00',
      timeInMs: 0,
    },
    {
      duration: 900,
      status: 'upcoming',
      text: '夜に駆ける',
      time: '00:01.05',
      timeInMs: 1050,
      words: [
        { duration: 300, text: '夜', timeInMs: 1050 },
        { duration: 200, text: 'に', timeInMs: 1350 },
        { duration: 400, text: '駆ける', timeInMs: 1550 },
      ],
    },
  ]);
});
