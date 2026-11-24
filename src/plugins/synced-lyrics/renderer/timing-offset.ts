/* oxlint-disable solid/reactivity -- signals are created under the plugin's shared owner */
import { createSignal, runWithOwner } from 'solid-js';

import { reactiveOwner } from './reactive-root';

const STORAGE_KEY = 'ytmd-synced-lyrics-global-offset-ms';
const MAX_OFFSET_MS = 10_000;

const readStoredOffset = () => {
  if (typeof localStorage === 'undefined') return 0;
  const value = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(value)
    ? Math.max(-MAX_OFFSET_MS, Math.min(MAX_OFFSET_MS, value))
    : 0;
};

const [offset, setOffset] = runWithOwner(reactiveOwner, () =>
  createSignal(readStoredOffset()),
)!;

export const lyricsTimingOffset = offset;

export const setLyricsTimingOffset = (value: number) => {
  const normalized = Math.max(
    -MAX_OFFSET_MS,
    Math.min(MAX_OFFSET_MS, Math.round(value / 100) * 100),
  );
  setOffset(normalized);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(normalized));
  }
};

export const adjustLyricsTimingOffset = (delta: number) =>
  setLyricsTimingOffset(lyricsTimingOffset() + delta);

/** Positive offsets delay the lyrics relative to audio. */
export const getEffectiveLyricsTime = (
  playbackTimeMs: number,
  offsetMs: number,
) => playbackTimeMs - offsetMs;

export const getOffsetSeekTime = (lineTimeMs: number, offsetMs: number) =>
  Math.max(0, lineTimeMs + offsetMs);
