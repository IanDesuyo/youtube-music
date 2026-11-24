import type { LineLyrics, TimedLyricWord } from '../types';

const lineRegex = /^\[(?<start>\d+),(?<duration>\d+)\](?<content>.*)$/;
const yrcWordRegex = /\((?<start>\d+),(?<duration>\d+),\d+\)(?<text>[^()]*)/g;
const kLyricWordRegex = /\(0,(?<duration>\d+)\)(?<text>[^()]*)/g;

const formatTime = (milliseconds: number) => {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const addIntroLine = (lines: LineLyrics[]) => {
  lines.sort((left, right) => left.timeInMs - right.timeInMs);
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

const parseLines = (
  value: string,
  parseWords: (
    content: string,
    lineStart: number,
    offset: number,
  ) => TimedLyricWord[],
) => {
  const lines: LineLyrics[] = [];
  let offset = 0;

  for (const rawLine of value.split(/\r?\n/)) {
    const offsetMatch = rawLine.match(/^\[offset:(?<offset>-?\d+)\]$/)?.groups;
    if (offsetMatch) {
      offset = Number(offsetMatch.offset);
      continue;
    }

    const match = rawLine.match(lineRegex)?.groups;
    if (!match) continue;
    const start = Number(match.start) + offset;
    const duration = Number(match.duration);
    const words = parseWords(match.content, start, offset).filter(
      ({ text }) => text,
    );
    if (!words.length) continue;

    lines.push({
      time: formatTime(start),
      timeInMs: start,
      duration,
      text: words.map(({ text }) => text).join(''),
      words,
      status: 'upcoming',
    });
  }

  return addIntroLine(lines);
};

export const parseNetEaseYrc = (value: string) =>
  parseLines(value, (content, _lineStart, offset) =>
    Array.from(content.matchAll(yrcWordRegex), (match) => ({
      text: match.groups!.text,
      timeInMs: Number(match.groups!.start) + offset,
      duration: Number(match.groups!.duration),
    })),
  );

export const parseNetEaseKLyric = (value: string) =>
  parseLines(value, (content, lineStart) => {
    let cursor = lineStart;
    return Array.from(content.matchAll(kLyricWordRegex), (match) => {
      const duration = Number(match.groups!.duration);
      const word = {
        text: match.groups!.text,
        timeInMs: cursor,
        duration,
      };
      cursor += duration;
      return word;
    });
  });
