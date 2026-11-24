import { expect, test } from '@playwright/test';

import {
  isConfidentLyricsMatch,
  normalizeMatchText,
  scoreLyricsMatch,
} from './matching';

test('normalizes common video and edition decorations', () => {
  expect(normalizeMatchText('One Last Kiss (Official Music Video)')).toBe(
    'onelastkiss',
  );
  expect(normalizeMatchText('アイドル【歌詞】')).toBe('アイドル');
});

test('scores the title and any matching artist alias', () => {
  const match = scoreLyricsMatch(
    {
      title: '夜に駆ける',
      alternativeTitle: 'Racing into the Night',
      artist: 'YOASOBI',
    },
    { title: '夜に駆ける', artists: ['Ayase', 'YOASOBI'] },
  );

  expect(match.title).toBe(1);
  expect(match.artist).toBe(1);
  expect(match.score).toBe(1);
  expect(isConfidentLyricsMatch(match)).toBe(true);
});

test('rejects an unrelated fallback track even when the artist is similar', () => {
  const match = scoreLyricsMatch(
    { title: '夜に駆ける', artist: 'YOASOBI' },
    { title: 'NOKIA', artists: ['YOASOBI'] },
  );

  expect(isConfidentLyricsMatch(match)).toBe(false);
});

test('accepts harmless version suffixes and featured-artist spelling', () => {
  const match = scoreLyricsMatch(
    { title: 'Idol', artist: 'YOASOBI feat. Ikura' },
    { title: 'Idol - Live Version', artists: ['YOASOBI & Ikura'] },
  );

  expect(isConfidentLyricsMatch(match)).toBe(true);
});

test('matches 晩餐歌 by tuki. despite artist punctuation', () => {
  const match = scoreLyricsMatch(
    { title: '晩餐歌', artist: 'tuki.' },
    { title: '晩餐歌', artists: ['tuki.'] },
  );

  expect(match).toEqual({ title: 1, artist: 1, score: 1 });
});
