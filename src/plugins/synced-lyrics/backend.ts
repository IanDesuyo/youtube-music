import { net } from 'electron';

import { createBackend } from '@/utils';

import { prepareProviderRequest } from './backend-request';
import { prepareNetEaseLyricsRequest } from './netease-eapi';

const handlers = {
  // Note: This will only be used for Forbidden headers, e.g. User-Agent, Authority, Cookie, etc.
  // See: https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header
  async fetch(
    url: string,
    init: RequestInit,
  ): Promise<[number, string, Record<string, string>]> {
    const res = await net.fetch(url, prepareProviderRequest(init));
    return [
      res.status,
      await res.text(),
      Object.fromEntries(res.headers.entries()),
    ];
  },
  async netEaseLyrics(songId: number): Promise<[number, string]> {
    const request = prepareNetEaseLyricsRequest(songId);
    const response = await net.fetch(
      request.url,
      prepareProviderRequest(request.init),
    );
    return [response.status, await response.text()];
  },
};

export const backend = createBackend({
  start(ctx) {
    ctx.ipc.handle('synced-lyrics:fetch', (url: string, init: RequestInit) =>
      handlers.fetch(url, init),
    );
    ctx.ipc.handle('synced-lyrics:netease-lyrics', (songId: number) =>
      handlers.netEaseLyrics(songId),
    );
  },
  stop(ctx) {
    ctx.ipc.removeHandler('synced-lyrics:fetch');
    ctx.ipc.removeHandler('synced-lyrics:netease-lyrics');
  },
});
