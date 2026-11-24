/* oxlint-disable @stylistic/no-mixed-operators */
import { fetchProvider } from './http';
import { isConfidentLyricsMatch, scoreLyricsMatch } from './matching';

import { LRC } from '../parsers/lrc';
import { config } from '../renderer/renderer';

import type { LyricProvider, LyricResult, SearchSongInfo } from '../types';

export class LRCLib implements LyricProvider {
  name = 'LRCLib';
  baseUrl = 'https://lrclib.net';

  async search(info: SearchSongInfo): Promise<LyricResult | null> {
    const { title, alternativeTitle, artist, album, songDuration, tags } = info;
    let query = new URLSearchParams({
      artist_name: artist,
      track_name: title,
    });

    query.set('album_name', album!);
    if (query.get('album_name') === 'undefined') {
      query.delete('album_name');
    }

    let url = `${this.baseUrl}/api/search?${query.toString()}`;
    let response = await fetchProvider(url);

    if (!response.ok) {
      throw new Error(`bad HTTPStatus(${response.statusText})`);
    }

    let data = (await response.json()) as LRCLIBSearchResponse;
    if (!data || !Array.isArray(data)) {
      throw new Error(`Expected an array, instead got ${typeof data}`);
    }

    if (data.length === 0) {
      if (!config()?.showLyricsEvenIfInexact) {
        return null;
      }

      // Try to search with the alternative title (original language)
      const trackName = alternativeTitle || title;
      query = new URLSearchParams({ q: `${trackName}` });
      url = `${this.baseUrl}/api/search?${query.toString()}`;

      response = await fetchProvider(url);
      if (!response.ok) {
        throw new Error(`bad HTTPStatus(${response.statusText})`);
      }

      data = (await response.json()) as LRCLIBSearchResponse;
      if (!Array.isArray(data)) {
        throw new Error(`Expected an array, instead got ${typeof data}`);
      }

      // If still no results, try with the original title as fallback
      if (data.length === 0 && alternativeTitle) {
        query = new URLSearchParams({ q: title });
        url = `${this.baseUrl}/api/search?${query.toString()}`;

        response = await fetchProvider(url);
        if (!response.ok) {
          throw new Error(`bad HTTPStatus(${response.statusText})`);
        }

        data = (await response.json()) as LRCLIBSearchResponse;
        if (!Array.isArray(data)) {
          throw new Error(`Expected an array, instead got ${typeof data}`);
        }
      }
    }

    const requested = {
      ...info,
      // YouTube Music sometimes exposes a channel as artist. Tags often contain
      // the actual credited artist, so consider them as aliases.
      artist: [artist, ...(tags ?? [])].join(', '),
    };
    const closestResult = data
      .map((candidate) => {
        const match = scoreLyricsMatch(requested, {
          title: candidate.trackName,
          artists: candidate.artistName.split(/[&,]/g),
        });
        const durationDelta = Math.abs(candidate.duration - songDuration);
        return {
          candidate,
          durationDelta,
          match,
          score: match.score - durationDelta / 300,
        };
      })
      .filter(
        ({ candidate, durationDelta, match }) =>
          !candidate.instrumental &&
          durationDelta <= 15 &&
          isConfidentLyricsMatch(match),
      )
      .sort((left, right) => right.score - left.score)[0]?.candidate;

    if (!closestResult) return null;

    const raw = closestResult.syncedLyrics;
    const plain = closestResult.plainLyrics;
    if (!raw && !plain) {
      return null;
    }

    return {
      title: closestResult.trackName,
      artists: closestResult.artistName.split(/[&,]/g),
      lines: raw
        ? LRC.parse(raw).lines.map((l) => ({
            ...l,
            status: 'upcoming' as const,
          }))
        : undefined,
      lyrics: plain,
    };
  }
}

type LRCLIBSearchResponse = {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
}[];
