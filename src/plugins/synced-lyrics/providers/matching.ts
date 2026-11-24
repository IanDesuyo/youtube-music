/* oxlint-disable @stylistic/no-mixed-operators */
import { jaroWinkler } from '@skyra/jaro-winkler';

import type { LyricResult, SearchSongInfo } from '../types';

const EDITION_WORDS =
  /\b(?:official(?:\s+(?:music\s+)?video)?|lyrics?|audio|mv|pv|visuali[sz]er|remaster(?:ed)?|live|version|ver\.?|karaoke|instrumental|cover)\b/giu;
const BRACKETED_EDITION =
  /[([{（【][^\])}）】]*(?:official|lyrics?|audio|mv|pv|visuali[sz]er|remaster|live|version|ver\.?|karaoke|instrumental|cover|歌詞|歌词|字幕|官方)[^\])}）】]*[\])}）】]/giu;

export const normalizeMatchText = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replaceAll(BRACKETED_EDITION, ' ')
    .replaceAll(EDITION_WORDS, ' ')
    .replaceAll(/(?:歌詞|歌词|字幕)/gu, ' ')
    .replaceAll(/(?:feat(?:uring)?|ft)\.?\s+/giu, ' ')
    .replaceAll(/[\s\p{P}\p{S}]/gu, '');

const similarity = (left: string, right: string) => {
  const a = normalizeMatchText(left);
  const b = normalizeMatchText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  const containment = longer.includes(shorter)
    ? Math.min(0.98, 0.86 + (0.12 * shorter.length) / longer.length)
    : 0;

  return Math.max(containment, jaroWinkler(a, b));
};

const splitArtists = (artists: string | string[]) =>
  (Array.isArray(artists) ? artists : [artists])
    .flatMap((artist) =>
      artist.split(/\s+(?:feat(?:uring)?|ft)\.?\s+|[&,/、，・]|\s+x\s+/giu),
    )
    .map((artist) => artist.trim())
    .filter(Boolean);

export type LyricsMatch = {
  artist: number;
  score: number;
  title: number;
};

export const scoreLyricsMatch = (
  requested: Pick<SearchSongInfo, 'title' | 'alternativeTitle' | 'artist'>,
  returned: Pick<LyricResult, 'title' | 'artists'>,
): LyricsMatch => {
  const wantedTitles = [requested.title, requested.alternativeTitle].filter(
    (title): title is string => Boolean(title),
  );
  const returnedTitles = returned.title
    .split(/\s+[-/|｜]\s+/u)
    .concat(returned.title);
  const title = Math.max(
    0,
    ...wantedTitles.flatMap((wanted) =>
      returnedTitles.map((candidate) => similarity(wanted, candidate)),
    ),
  );

  const wantedArtists = splitArtists(requested.artist);
  const returnedArtists = splitArtists(returned.artists);
  const artist = Math.max(
    0,
    ...wantedArtists.flatMap((wanted) =>
      returnedArtists.map((candidate) => similarity(wanted, candidate)),
    ),
  );

  return {
    title,
    artist,
    score: title * 0.7 + artist * 0.3,
  };
};

export const isConfidentLyricsMatch = (match: LyricsMatch) =>
  match.title >= 0.78 && match.score >= 0.7;

export const rankLyricsCandidate = <T>(
  requested: Pick<SearchSongInfo, 'title' | 'alternativeTitle' | 'artist'>,
  candidate: T,
  metadata: (candidate: T) => Pick<LyricResult, 'title' | 'artists'>,
) => ({ candidate, match: scoreLyricsMatch(requested, metadata(candidate)) });
