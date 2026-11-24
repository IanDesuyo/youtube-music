import type { ProviderState } from '../providers';
import type { SongInfo } from '@/providers/song-info';

export type LyricsAvailability =
  | 'fetching'
  | 'error'
  | 'missing'
  | 'word'
  | 'line'
  | 'plain';

export const createLyricsInspectorSongAccessor = (getSong: () => SongInfo) =>
  getSong;

export const getLyricsAvailability = (
  provider: ProviderState,
): LyricsAvailability => {
  if (provider.state === 'fetching') return 'fetching';
  if (provider.state === 'error') return 'error';
  if (!provider.data?.lines?.length && !provider.data?.lyrics) return 'missing';
  if (provider.data.lines?.some((line) => line.words?.length)) return 'word';
  if (provider.data.lines?.length) return 'line';
  return 'plain';
};

export const getLyricsPreview = (provider: ProviderState, limit = 3) => {
  const lines = provider.data?.lines?.length
    ? provider.data.lines.map(({ text }) => text)
    : (provider.data?.lyrics?.split('\n') ?? []);

  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
};
