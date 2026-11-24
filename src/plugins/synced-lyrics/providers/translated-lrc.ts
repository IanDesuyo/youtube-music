import { LRC } from '../parsers/lrc';

import type { LineLyrics } from '../types';

/**
 * Merge a second LRC track into the source track. Chinese music services do
 * not always use byte-identical timestamps, so accept a small drift while
 * still refusing to attach a translation to the wrong line.
 */
export const parseTranslatedLrc = (
  source: string,
  translation?: string,
): LineLyrics[] => {
  const lines: LineLyrics[] = LRC.parse(source).lines.map((line) => ({
    ...line,
    status: 'upcoming' as const,
  }));
  return mergeTranslations(lines, translation);
};

export const mergeTranslations = (
  lines: LineLyrics[],
  translation?: string,
): LineLyrics[] => {
  if (!translation) return lines;

  const translated = LRC.parse(translation).lines.filter((line) => line.text);
  for (const line of lines) {
    const candidate = translated.reduce<(typeof translated)[number] | null>(
      (closest, item) => {
        if (Math.abs(item.timeInMs - line.timeInMs) > 350) return closest;
        if (!closest) return item;
        return Math.abs(item.timeInMs - line.timeInMs) <
          Math.abs(closest.timeInMs - line.timeInMs)
          ? item
          : closest;
      },
      null,
    );
    if (candidate) line.translation = candidate.text;
  }

  return lines;
};
