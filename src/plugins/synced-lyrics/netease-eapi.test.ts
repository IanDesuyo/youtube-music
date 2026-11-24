import { expect, test } from '@playwright/test';

import { prepareNetEaseLyricsRequest } from './netease-eapi';

test('builds a deterministic encrypted NetEase YRC request', () => {
  const request = prepareNetEaseLyricsRequest(1824020871, 1_700_000_000_000, 7);
  const params = new URLSearchParams(request.init.body).get('params');

  expect(request.url).toBe(
    'https://interface3.music.163.com/eapi/song/lyric/v1',
  );
  expect(request.init.method).toBe('POST');
  expect(params).toMatch(/^[A-F0-9]+$/);
  expect(params?.length).toBeGreaterThan(500);
  expect(new Headers(request.init.headers).get('cookie')).toContain(
    'requestId=1700000000000_0007',
  );
});
