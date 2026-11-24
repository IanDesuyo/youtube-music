/* oxlint-disable @stylistic/no-mixed-operators */
/* oxlint-disable perfectionist(sort-imports) */
import { decryptQrc } from 'qrc-decoder';

import { isConfidentLyricsMatch, scoreLyricsMatch } from './matching';
import { mergeTranslations, parseTranslatedLrc } from './translated-lrc';

import { parseQrc } from '../parsers/qrc';
import { netFetch } from '../renderer';

import type { LyricProvider, LyricResult, SearchSongInfo } from '../types';

const headers = {
  'Referer': 'https://y.qq.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
};

const decodeLyric = (value?: string) => {
  if (!value) return '';
  if (value.trimStart().startsWith('[')) return value;
  try {
    const binary = atob(value.replaceAll(/\s/g, ''));
    return new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    );
  } catch {
    return value;
  }
};

export class QQMusic implements LyricProvider {
  name = 'QQMusic';
  baseUrl = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

  async search(info: SearchSongInfo): Promise<LyricResult | null> {
    const module = 'music.search.SearchCgiService';
    const searchBody = {
      [module]: {
        module,
        method: 'DoSearchForQQMusicDesktop',
        param: {
          search_type: 0,
          query: `${info.alternativeTitle || info.title} ${info.artist}`,
          page_num: 1,
          num_per_page: 20,
        },
      },
    };
    const [status, raw] = await netFetch(this.baseUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(searchBody),
    });
    if (status < 200 || status >= 300) {
      throw new Error(`QQMusic search failed (${status})`);
    }

    const data = JSON.parse(raw) as QQSearchResponse;
    const songs = data[module]?.data?.body?.song?.list ?? [];
    const match = songs
      .map((song) => {
        const match = scoreLyricsMatch(info, {
          title: song.name || song.title,
          artists: song.singer.map(({ name }) => name),
        });
        const durationDelta = Math.abs(song.interval - info.songDuration);
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
      .sort((a, b) => b.score - a.score)[0]?.song;
    if (!match) return null;

    const lyricBody = {
      comm: { ct: 24, cv: 0 },
      lyric: {
        module: 'music.musichallSong.PlayLyricInfo',
        method: 'GetPlayLyricInfo',
        param: {
          songMID: match.mid,
          songID: match.id,
          crypt: 1,
          qrc: 1,
          roma: 1,
          trans: 1,
        },
      },
    };
    const [lyricStatus, lyricRaw] = await netFetch(this.baseUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(lyricBody),
    });
    if (lyricStatus < 200 || lyricStatus >= 300) {
      throw new Error(`QQMusic lyrics failed (${lyricStatus})`);
    }

    const lyricResponse = JSON.parse(lyricRaw) as QQLyricsResponse;
    const lyricData = lyricResponse.lyric?.data;
    if (!lyricData?.lyric) return null;

    const isQrc = lyricData.qrc === 1 && lyricData.crypt === 1;
    const source = isQrc
      ? decryptQrc(lyricData.lyric)
      : decodeLyric(lyricData.lyric);

    const translation = lyricData.trans
      ? isQrc
        ? decryptQrc(lyricData.trans)
        : decodeLyric(lyricData.trans)
      : '';

    return {
      title: match.name || match.title,
      artists: match.singer.map(({ name }) => name),
      lines: isQrc
        ? mergeTranslations(parseQrc(source), translation)
        : parseTranslatedLrc(source, translation),
    };
  }
}

interface QQSong {
  id: number;
  mid: string;
  name: string;
  title: string;
  interval: number;
  singer: { name: string }[];
}

type QQSearchResponse = Record<
  string,
  { data?: { body?: { song?: { list?: QQSong[] } } } } | undefined
>;

interface QQLyricsResponse {
  lyric?: {
    data?: {
      crypt?: number;
      lyric?: string;
      qrc?: number;
      trans?: string;
    };
  };
}
