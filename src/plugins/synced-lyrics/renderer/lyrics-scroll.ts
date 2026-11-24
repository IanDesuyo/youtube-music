export type LyricsLineStatus = 'previous' | 'current' | 'upcoming';

export const getLyricsScrollTarget = (
  statuses: LyricsLineStatus[],
  previousIndex: number,
) => {
  if (
    statuses.length > 0 &&
    statuses.every((status) => status === 'upcoming')
  ) {
    return { index: 0, align: 'start' as const, smooth: false };
  }

  const currentIndex = statuses.findIndex((status) => status === 'current');
  const retainedIndex = currentIndex === -1 ? previousIndex : currentIndex;
  return {
    index: Math.min(retainedIndex + 1, statuses.length - 1),
    align: 'center' as const,
    smooth: true,
  };
};
