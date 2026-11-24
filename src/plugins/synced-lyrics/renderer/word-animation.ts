import type { TimedLyricWord } from '../types';

export interface WordAnimationState {
  activeIndex: number;
  completedIndex: number;
  progress: number;
}

export const getWordAnimationState = (
  words: TimedLyricWord[],
  timeInMs: number,
): WordAnimationState => {
  let activeIndex = -1;
  let completedIndex = -1;
  let progress = 0;

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const duration = Math.max(0, word.duration);
    const endTime = word.timeInMs + duration;

    if (duration === 0) {
      if (timeInMs >= word.timeInMs) completedIndex = index;
      continue;
    }
    if (timeInMs >= endTime) {
      completedIndex = index;
      continue;
    }
    if (timeInMs >= word.timeInMs) {
      activeIndex = index;
      progress = Math.max(
        0,
        Math.min(1, (timeInMs - word.timeInMs) / duration),
      );
    }
    break;
  }

  return { activeIndex, completedIndex, progress };
};
