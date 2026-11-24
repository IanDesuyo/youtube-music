import { expect, test } from '@playwright/test';

import {
  prepareProviderRequest,
  PROVIDER_REQUEST_TIMEOUT_MS,
} from './backend-request';

test('removes an explicit Host header before Electron net.fetch', () => {
  const request = prepareProviderRequest({
    method: 'POST',
    headers: {
      Host: 'example.test',
      'User-Agent': 'lyrics-provider',
    },
    body: '{}',
  });
  const headers = new Headers(request.headers);

  expect(headers.has('host')).toBe(false);
  expect(headers.get('user-agent')).toBe('lyrics-provider');
  expect(request.method).toBe('POST');
  expect(request.body).toBe('{}');
});

test('adds a finite timeout signal', () => {
  const request = prepareProviderRequest();

  expect(PROVIDER_REQUEST_TIMEOUT_MS).toBe(15_000);
  expect(request.signal).toBeInstanceOf(AbortSignal);
  expect(request.signal?.aborted).toBe(false);
});
