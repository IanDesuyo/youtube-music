import { createEffect, createSignal, For, Show } from 'solid-js';

import { config } from '../renderer';
import { furiganizeJapanese, type FuriganaSegment } from '../utils';

export const FuriganaText = (props: {
  text: string;
  animate?: boolean;
  japaneseContext?: string;
}) => {
  const [segments, setSegments] = createSignal<FuriganaSegment[]>([]);
  let requestId = 0;

  createEffect(() => {
    const text = props.text;
    const currentRequest = ++requestId;
    if (!config()?.romanization) {
      setSegments([{ text }]);
      return;
    }

    const request = furiganizeJapanese(text, props.japaneseContext)
      .then((result) => {
        if (currentRequest === requestId) setSegments(result);
      })
      .catch(() => {
        if (currentRequest === requestId) setSegments([{ text }]);
      });
    return request;
  });

  return (
    <For each={segments()}>
      {(segment, index) => (
        <span
          class={props.animate === false ? 'furigana-token' : 'lyric-token'}
          style={{
            'transition-delay': `${index() * 0.05}s`,
            'animation-delay': `${index() * 0.05}s`,
          }}
        >
          <Show fallback={segment.text} when={segment.reading}>
            <ruby>
              {segment.text}
              <rp>（</rp>
              <rt>{segment.reading}</rt>
              <rp>）</rp>
            </ruby>
          </Show>
        </span>
      )}
    </For>
  );
};
