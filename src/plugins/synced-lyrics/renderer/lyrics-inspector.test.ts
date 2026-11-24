import { expect, test } from '@playwright/test';
import { createRoot } from 'solid-js';

import {
  createLyricsInspectorSongAccessor,
  getLyricsAvailability,
  getLyricsPreview,
} from './lyrics-inspector';

import type { SongInfo } from '@/providers/song-info';

test('reads song metadata loaded after the inspector component mounts', () => {
  let song = { title: '', artist: '' } as SongInfo;

  createRoot((dispose) => {
    const currentSong = createLyricsInspectorSongAccessor(() => song);
    expect(currentSong().title).toBe('');

    song = {
      title: '夜に駆ける',
      artist: 'YOASOBI',
    } as SongInfo;

    expect(currentSong().title).toBe('夜に駆ける');
    expect(currentSong().artist).toBe('YOASOBI');
    dispose();
  });
});

test('describes word-timed lyrics and builds a compact preview', () => {
  const provider = {
    state: 'done' as const,
    error: null,
    data: {
      title: 'Song',
      artists: ['Artist'],
      lines: [
        {
          time: '00:01.00',
          timeInMs: 1000,
          duration: 1000,
          text: ' First line ',
          words: [{ text: 'First', timeInMs: 1000, duration: 500 }],
          status: 'upcoming' as const,
        },
        {
          time: '00:02.00',
          timeInMs: 2000,
          duration: 1000,
          text: '',
          status: 'upcoming' as const,
        },
        {
          time: '00:03.00',
          timeInMs: 3000,
          duration: 1000,
          text: 'Second line',
          status: 'upcoming' as const,
        },
      ],
    },
  };

  expect(getLyricsAvailability(provider)).toBe('word');
  expect(getLyricsPreview(provider)).toEqual(['First line', 'Second line']);
});

test('reports provider states without lyrics', () => {
  expect(
    getLyricsAvailability({ state: 'fetching', data: null, error: null }),
  ).toBe('fetching');
  expect(
    getLyricsAvailability({
      state: 'error',
      data: null,
      error: new Error('offline'),
    }),
  ).toBe('error');
  expect(
    getLyricsAvailability({ state: 'done', data: null, error: null }),
  ).toBe('missing');
});
