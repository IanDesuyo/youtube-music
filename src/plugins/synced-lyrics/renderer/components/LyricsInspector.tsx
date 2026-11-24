import { IconClose } from '@mdui/icons/close.js';
import { IconLyrics } from '@mdui/icons/lyrics.js';
import { For, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

import { LitElementWrapper } from '@/solit';

import {
  type ProviderName,
  providerNames,
  type ProviderState,
} from '../../providers';
import {
  isConfidentLyricsMatch,
  scoreLyricsMatch,
} from '../../providers/matching';
import {
  createLyricsInspectorSongAccessor,
  getLyricsAvailability,
  getLyricsPreview,
} from '../lyrics-inspector';
import {
  adjustLyricsTimingOffset,
  lyricsTimingOffset,
  setLyricsTimingOffset,
} from '../timing-offset';

import type { SongInfo } from '@/providers/song-info';

const availabilityLabel = {
  fetching: '讀取中',
  error: '讀取失敗',
  missing: '沒有歌詞',
  word: '逐字同步',
  line: '逐行同步',
  plain: '純文字',
} as const;

const confidenceLabel = (score: number) => {
  if (score >= 0.88) return '高度匹配';
  if (score >= 0.7) return '可能匹配';
  return '低度匹配';
};

export const LyricsInspector = (props: {
  currentProvider: ProviderName;
  getSong: () => SongInfo;
  isOpen: boolean;
  lyrics: Record<ProviderName, ProviderState>;
  onClose: () => void;
  onSelect: (provider: ProviderName) => void;
  starredProvider: ProviderName | null;
}) => {
  const closeOnEscape = (event: KeyboardEvent) => {
    if (props.isOpen && event.key === 'Escape') props.onClose();
  };

  onMount(() => document.addEventListener('keydown', closeOnEscape));
  onCleanup(() => document.removeEventListener('keydown', closeOnEscape));

  // Intentionally keep this as a live getter. SongInfo is replaced outside
  // Solid's graph, so memoizing it freezes the pre-load empty metadata.
  // oxlint-disable-next-line solid/reactivity
  const song = createLyricsInspectorSongAccessor(props.getSong);

  return (
    <Show when={props.isOpen}>
      <Portal mount={document.body}>
        <div
          class="lyrics-inspector-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) props.onClose();
          }}
        >
          <section
            aria-label="檢視與切換歌詞來源"
            aria-modal="true"
            class="lyrics-inspector"
            role="dialog"
          >
            <header class="lyrics-inspector-header">
              <div>
                <span class="lyrics-inspector-eyebrow">LYRICS SOURCES</span>
                <h2>檢視歌詞來源</h2>
                <p>
                  {song().title} · {song().artist}
                </p>
                <div
                  aria-label="歌詞時間偏移設定"
                  class="lyrics-timing-controls"
                >
                  <button
                    onClick={() => adjustLyricsTimingOffset(-100)}
                    title="讓歌詞提早 100 毫秒"
                    type="button"
                  >
                    −100 ms
                  </button>
                  <output
                    classList={{ adjusted: lyricsTimingOffset() !== 0 }}
                    title="正數代表歌詞延後"
                  >
                    {lyricsTimingOffset() > 0 ? '+' : ''}
                    {lyricsTimingOffset()} ms
                  </output>
                  <button
                    onClick={() => adjustLyricsTimingOffset(100)}
                    title="讓歌詞延後 100 毫秒"
                    type="button"
                  >
                    +100 ms
                  </button>
                  <button
                    class="lyrics-timing-reset"
                    disabled={lyricsTimingOffset() === 0}
                    onClick={() => setLyricsTimingOffset(0)}
                    type="button"
                  >
                    歸零
                  </button>
                </div>
              </div>
              <button
                aria-label="關閉歌詞來源視窗"
                class="lyrics-inspector-close"
                onClick={() => props.onClose()}
                type="button"
              >
                <LitElementWrapper elementClass={IconClose} />
              </button>
            </header>

            <div class="lyrics-inspector-list">
              <For each={providerNames}>
                {(provider) => {
                  const state = () => props.lyrics[provider];
                  const availability = () => getLyricsAvailability(state());
                  const preview = () => getLyricsPreview(state());
                  const match = () => {
                    const data = state().data;
                    return data ? scoreLyricsMatch(song(), data) : null;
                  };
                  const canSelect = () =>
                    state().state === 'done' &&
                    Boolean(
                      state().data?.lines?.length || state().data?.lyrics,
                    );

                  return (
                    <article
                      class="lyrics-source-card"
                      classList={{
                        active: props.currentProvider === provider,
                        selectable: canSelect(),
                      }}
                    >
                      <div class="lyrics-source-card-topline">
                        <div class="lyrics-source-provider">
                          <strong>{provider}</strong>
                          <Show when={props.starredProvider === provider}>
                            <span
                              aria-label="已設為偏好來源"
                              title="已設為偏好來源"
                            >
                              ★
                            </span>
                          </Show>
                        </div>
                        <div class="lyrics-source-badges">
                          <span class={`lyrics-source-kind ${availability()}`}>
                            {availabilityLabel[availability()]}
                          </span>
                          <Show when={match()}>
                            {(value) => (
                              <span
                                class="lyrics-source-score"
                                classList={{
                                  low: !isConfidentLyricsMatch(value()),
                                }}
                                title={`標題 ${Math.round(value().title * 100)}% · 歌手 ${Math.round(value().artist * 100)}%`}
                              >
                                {confidenceLabel(value().score)}{' '}
                                {Math.round(value().score * 100)}%
                              </span>
                            )}
                          </Show>
                        </div>
                      </div>

                      <Show
                        fallback={
                          <p class="lyrics-source-empty">
                            {state().state === 'error'
                              ? state().error?.message || '來源暫時無法使用'
                              : state().state === 'fetching'
                                ? '正在向來源查詢…'
                                : '這個來源沒有找到可用歌詞'}
                          </p>
                        }
                        when={state().data}
                      >
                        {(data) => (
                          <>
                            <p class="lyrics-source-track" title={data().title}>
                              {data().title}
                            </p>
                            <p
                              class="lyrics-source-artist"
                              title={data().artists.join('、')}
                            >
                              {data().artists.join('、')}
                            </p>
                            <Show when={preview().length}>
                              <div class="lyrics-source-preview">
                                <For each={preview()}>
                                  {(line) => <span>{line}</span>}
                                </For>
                              </div>
                            </Show>
                          </>
                        )}
                      </Show>

                      <button
                        class="lyrics-source-select"
                        disabled={
                          !canSelect() || props.currentProvider === provider
                        }
                        onClick={() => props.onSelect(provider)}
                        type="button"
                      >
                        {props.currentProvider === provider
                          ? '目前使用中'
                          : '切換到這份歌詞'}
                      </button>
                    </article>
                  );
                }}
              </For>
            </div>
          </section>
        </div>
      </Portal>
    </Show>
  );
};

export const LyricsInspectorIcon = () => (
  <LitElementWrapper elementClass={IconLyrics} />
);
