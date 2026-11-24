import { For, Show, createEffect, createMemo, onCleanup } from 'solid-js';
import { type VirtualizerHandle } from 'virtua/solid';

import { type LineLyrics } from '@/plugins/synced-lyrics/types';

import { FuriganaText } from './FuriganaText';

import { _ytAPI } from '..';
import { config, currentTime } from '../renderer';
import {
  getEffectiveLyricsTime,
  getOffsetSeekTime,
  lyricsTimingOffset,
} from '../timing-offset';
import { convertChineseCharacter } from '../utils';
import { getWordAnimationState } from '../word-animation';

interface SyncedLineProps {
  scroller: VirtualizerHandle;
  index: number;

  line: LineLyrics;
  status: 'upcoming' | 'current' | 'previous';
}

const EmptyLine = (props: SyncedLineProps) => {
  const states = createMemo(() => {
    const defaultText = config()?.defaultTextString ?? '';
    return Array.isArray(defaultText) ? defaultText : [defaultText];
  });

  const index = createMemo(() => {
    const progress =
      getEffectiveLyricsTime(currentTime(), lyricsTimingOffset()) -
      props.line.timeInMs;
    const total = props.line.duration;

    const percentage = Math.min(1, progress / total);
    return Math.max(0, Math.floor((states().length - 1) * percentage));
  });

  return (
    <div
      class={`synced-line ${props.status}`}
      onClick={() => {
        _ytAPI?.seekTo(
          (getOffsetSeekTime(props.line.timeInMs, lyricsTimingOffset()) + 10) /
            1000,
        );
      }}
    >
      <div class="description ytmusic-description-shelf-renderer" dir="auto">
        <yt-formatted-string
          text={{
            runs: [
              {
                text: config()?.showTimeCodes ? `[${props.line.time}] ` : '',
              },
            ],
          }}
        />

        <div class="text-lyrics">
          <span>
            <span>
              <Show
                fallback={
                  <yt-formatted-string
                    text={{ runs: [{ text: states()[0] }] }}
                  />
                }
                when={states().length > 1}
              >
                <yt-formatted-string
                  text={{
                    runs: [
                      {
                        text: states().at(
                          props.status === 'current' ? index() : -1,
                        )!,
                      },
                    ],
                  }}
                />
              </Show>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export const SyncedLine = (props: SyncedLineProps) => {
  const wordElements: HTMLSpanElement[] = [];

  const convertText = (value: string) => {
    const convertChineseText = config()?.convertChineseCharacter;
    return convertChineseText && convertChineseText !== 'disabled'
      ? convertChineseCharacter(value, convertChineseText)
      : value;
  };

  const text = createMemo(() => {
    return convertText(props.line.text).trim();
  });

  const words = createMemo(() =>
    props.line.words?.map((word) => ({
      ...word,
      text: convertText(word.text),
    })),
  );

  const translation = createMemo(() => {
    let line = props.line.translation?.trim() ?? '';
    const convertChineseText = config()?.convertChineseCharacter;
    if (line && convertChineseText && convertChineseText !== 'disabled') {
      line = convertChineseCharacter(line, convertChineseText);
    }
    return line;
  });

  createEffect(() => {
    const timedWords = words() ?? [];
    const status = props.status;
    if (!timedWords.length || wordElements.length !== timedWords.length) return;

    let animationFrame: number | undefined;
    let pausedTimer: number | undefined;
    let previousActiveIndex = -1;
    let previousCompletedIndex = -2;

    const setState = (
      element: HTMLSpanElement,
      state: 'upcoming' | 'active' | 'complete',
    ) => {
      if (element.dataset.lyricState === state) return;
      element.dataset.lyricState = state;
      element.classList.toggle('active', state === 'active');
      element.classList.toggle('complete', state === 'complete');
      if (state !== 'active') element.style.removeProperty('--word-progress');
    };

    const syncWords = (timeInMs: number, force = false) => {
      const { activeIndex, completedIndex, progress } = getWordAnimationState(
        timedWords,
        timeInMs,
      );

      if (
        force ||
        activeIndex !== previousActiveIndex ||
        completedIndex !== previousCompletedIndex
      ) {
        for (let index = 0; index < wordElements.length; index++) {
          setState(
            wordElements[index],
            index <= completedIndex
              ? 'complete'
              : index === activeIndex
                ? 'active'
                : 'upcoming',
          );
        }
        previousActiveIndex = activeIndex;
        previousCompletedIndex = completedIndex;
      }

      if (activeIndex >= 0) {
        wordElements[activeIndex].style.setProperty(
          '--word-progress',
          `${(progress * 100).toFixed(3)}%`,
        );
      }
    };

    if (status !== 'current') {
      syncWords(
        status === 'previous'
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY,
        true,
      );
      return;
    }

    const tick = () => {
      const api = _ytAPI;
      syncWords(
        getEffectiveLyricsTime(
          (api?.getCurrentTime() ?? currentTime() / 1000) * 1000,
          lyricsTimingOffset(),
        ),
      );

      // Keep the active wipe tied to the browser's paint cycle. While paused,
      // poll slowly so a paused seek is still reflected without burning a core.
      if (api?.getPlayerState() === 1) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        pausedTimer = window.setTimeout(() => {
          animationFrame = requestAnimationFrame(tick);
        }, 100);
      }
    };

    tick();
    onCleanup(() => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      if (pausedTimer !== undefined) window.clearTimeout(pausedTimer);
    });
  });

  return (
    <Show fallback={<EmptyLine {...props} />} when={text()}>
      <div
        class={`synced-line ${props.status}`}
        onClick={() => {
          _ytAPI?.seekTo(
            (getOffsetSeekTime(props.line.timeInMs, lyricsTimingOffset()) +
              10) /
              1000,
          );
        }}
      >
        <div class="description ytmusic-description-shelf-renderer" dir="auto">
          <yt-formatted-string
            text={{
              runs: [
                {
                  text: config()?.showTimeCodes ? `[${props.line.time}] ` : '',
                },
              ],
            }}
          />

          <div
            class="text-lyrics"
            ref={(div: HTMLDivElement) => {
              // TODO: Investigate the animation, even though the duration is properly set, all lines have the same animation duration
              div.style.setProperty(
                '--lyrics-duration',
                `${props.line.duration / 1000}s`,
                'important',
              );
            }}
            style={{ 'display': 'flex', 'flex-direction': 'column' }}
          >
            <span
              class="lyric-primary"
              classList={{ 'word-synced': Boolean(words()?.length) }}
            >
              <Show
                fallback={<FuriganaText text={text()} />}
                when={words()?.length}
              >
                <For each={words()}>
                  {(word, index) => (
                    <span
                      class="timed-word"
                      ref={(element) => {
                        wordElements[index()] = element;
                      }}
                    >
                      <FuriganaText
                        animate={false}
                        japaneseContext={text()}
                        text={word.text}
                      />
                    </span>
                  )}
                </For>
              </Show>
            </span>

            <Show when={translation()}>
              <span class="translation">
                <yt-formatted-string
                  text={{ runs: [{ text: translation() }] }}
                />
              </span>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
