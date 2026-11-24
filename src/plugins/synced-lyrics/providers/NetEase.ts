/* oxlint-disable @stylistic/no-mixed-operators */
/* oxlint-disable perfectionist(sort-imports) */
import { isConfidentLyricsMatch, scoreLyricsMatch } from './matching';
import { parseTranslatedLrc } from './translated-lrc';

import { parseNetEaseKLyric, parseNetEaseYrc } from '../parsers/netease-word';
import { netEaseLyricsFetch, netFetch } from '../renderer';

import type { LyricProvider, LyricResult, SearchSongInfo } from '../types';

const headers = {
  'Referer': 'https://music.163.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
};

export class NetEase implements LyricProvider {
  name = 'NetEase';
  baseUrl = 'https://music.163.com';

  async search(info: SearchSongInfo): Promise<LyricResult | null> {
    const query = new URLSearchParams({
      s: `${info.alternativeTitle || info.title} ${info.artist}`,
      type: '1',
      offset: '0',
      limit: '10',
    });
    const [status, raw] = await netFetch(
      `${this.baseUrl}/api/search/get?${query}`,
      { headers },
    );
    if (status < 200 || status >= 300) {
      throw new Error(`NetEase search failed (${status})`);
    }

    const data = JSON.parse(raw) as NetEaseSearchResponse;
    const candidates = data.result?.songs ?? [];
    const ranked = candidates
      .map((song) => {
        const titles = [song.name, ...(song.transNames ?? [])];
        const matches = titles.map((title) =>
          scoreLyricsMatch(info, {
            title,
            artists: song.artists.map(({ name }) => name),
          }),
        );
        const match = matches.sort((a, b) => b.score - a.score)[0];
        const durationSeconds = song.duration / 1000;
        const durationDelta = Math.abs(durationSeconds - info.songDuration);
        return {
          song,
          match,
          durationDelta,
          score: match.score - durationDelta / 300,
        };
      })
      .filter(
        ({ durationDelta, match }) =>
          durationDelta <= 15 && isConfidentLyricsMatch(match),
      )
      .sort((a, b) => b.score - a.score);

    const match = ranked[0]?.song;
    if (!match) return null;

    const [lyricStatus, lyricRaw] = await netEaseLyricsFetch(match.id);
    if (lyricStatus < 200 || lyricStatus >= 300) {
      throw new Error(`NetEase lyrics failed (${lyricStatus})`);
    }

    const lyrics = JSON.parse(lyricRaw) as NetEaseLyricsResponse;
    const yrc = lyrics.yrc?.lyric;
    const kLyric = lyrics.klyric?.lyric;
    const lrc = lyrics.lrc?.lyric;
    const lines = yrc
      ? parseNetEaseYrc(yrc)
      : kLyric
        ? parseNetEaseKLyric(kLyric)
        : lrc
          ? parseTranslatedLrc(lrc, lyrics.tlyric?.lyric)
          : [];
    if (!lines.length) return null;

    if ((yrc || kLyric) && lyrics.tlyric?.lyric) {
      const translated = parseTranslatedLrc(lyrics.tlyric.lyric).filter(
        ({ text }) => text,
      );
      for (const line of lines) {
        const closest = translated
          .filter((item) => Math.abs(item.timeInMs - line.timeInMs) <= 350)
          .sort(
            (left, right) =>
              Math.abs(left.timeInMs - line.timeInMs) -
              Math.abs(right.timeInMs - line.timeInMs),
          )[0];
        if (closest) line.translation = closest.text;
      }
    }

    return {
      title: match.name,
      artists: match.artists.map(({ name }) => name),
      lines,
    };
  }
}

interface NetEaseSearchResponse {
  result?: {
    songs?: {
      id: number;
      name: string;
      transNames?: string[];
      duration: number;
      artists: { name: string }[];
    }[];
  };
}

interface NetEaseLyricsResponse {
  lrc?: { lyric?: string };
  klyric?: { lyric?: string };
  tlyric?: { lyric?: string };
  yrc?: { lyric?: string };
}
