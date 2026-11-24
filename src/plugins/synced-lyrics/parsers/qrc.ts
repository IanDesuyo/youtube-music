import type { LineLyrics, TimedLyricWord } from '../types';

const lineRegex = /^\[(?<start>\d+),(?<duration>\d+)\](?<content>.*)$/;
const wordRegex = /\((?<start>\d+),(?<duration>\d+)(?:,\d+)?\)/g;

const decodeXmlEntities = (value: string) =>
  value
    .replaceAll('&#10;', '\n')
    .replaceAll('&#13;', '\r')
    .replaceAll('&#32;', ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

export const extractQrcContent = (value: string) => {
  const content = value.match(/LyricContent="(?<content>[\s\S]*?)"\s*\/?\s*>/)
    ?.groups?.content;
  return decodeXmlEntities(content ?? value);
};

const formatTime = (milliseconds: number) => {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

export const parseQrc = (value: string): LineLyrics[] => {
  const lines: LineLyrics[] = [];
  let offset = 0;

  for (const rawLine of extractQrcContent(value).split(/\r?\n/)) {
    const offsetMatch = rawLine.match(/^\[offset:(?<offset>-?\d+)\]$/)?.groups;
    if (offsetMatch) {
      offset = Number(offsetMatch.offset);
      continue;
    }

    const match = rawLine.match(lineRegex)?.groups;
    if (!match) continue;

    const start = Number(match.start) + offset;
    const duration = Number(match.duration);
    const words: TimedLyricWord[] = [];
    let cursor = 0;

    for (const wordMatch of match.content.matchAll(wordRegex)) {
      const groups = wordMatch.groups!;
      const text = match.content.slice(cursor, wordMatch.index);
      if (text) {
        words.push({
          text,
          timeInMs: Number(groups.start) + offset,
          duration: Number(groups.duration),
        });
      }
      cursor = wordMatch.index + wordMatch[0].length;
    }

    const trailingText = match.content.slice(cursor);
    if (trailingText) {
      const lastWord = words.at(-1);
      words.push({
        text: trailingText,
        timeInMs: lastWord ? lastWord.timeInMs + lastWord.duration : start,
        duration: Math.max(
          0,
          start +
            duration -
            (lastWord ? lastWord.timeInMs + lastWord.duration : start),
        ),
      });
    }

    const text = words.length
      ? words.map((word) => word.text).join('')
      : match.content;
    lines.push({
      time: formatTime(start),
      timeInMs: start,
      duration,
      text,
      words: words.length ? words : undefined,
      status: 'upcoming',
    });
  }

  lines.sort((a, b) => a.timeInMs - b.timeInMs);
  const first = lines.at(0);
  if (first && first.timeInMs > 300) {
    lines.unshift({
      time: '00:00.00',
      timeInMs: 0,
      duration: first.timeInMs,
      text: '',
      status: 'upcoming',
    });
  }
  return lines;
};
