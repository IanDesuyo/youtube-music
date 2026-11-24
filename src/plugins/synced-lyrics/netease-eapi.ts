import { createCipheriv, createHash, randomInt } from 'node:crypto';

const EAPI_KEY = Buffer.from('e82ckenh8dichen8');
const EAPI_URL = 'https://interface3.music.163.com/eapi/song/lyric/v1';
const EAPI_PATH = '/api/song/lyric/v1';

export const prepareNetEaseLyricsRequest = (
  songId: number,
  now = Date.now(),
  requestSuffix = randomInt(0, 1000),
) => {
  const header = {
    __csrf: '',
    appver: '8.0.0',
    buildver: String(Math.floor(now / 1000)),
    channel: '',
    deviceId: '',
    mobilename: '',
    resolution: '1920x1080',
    os: 'android',
    osver: '',
    requestId: `${now}_${requestSuffix.toString().padStart(4, '0')}`,
    versioncode: '140',
    MUSIC_U: '',
  };
  const payload = JSON.stringify({
    id: String(songId),
    cp: 'false',
    lv: '0',
    kv: '0',
    tv: '0',
    rv: '0',
    yv: '0',
    ytv: '0',
    yrv: '0',
    csrf_token: '',
    header: JSON.stringify(header),
  });
  const digest = createHash('md5')
    .update(`nobody${EAPI_PATH}use${payload}md5forencrypt`)
    .digest('hex');
  const plaintext = `${EAPI_PATH}-36cd479b6b5-${payload}-36cd479b6b5-${digest}`;
  const cipher = createCipheriv('aes-128-ecb', EAPI_KEY, null);
  const params = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
    .toString('hex')
    .toUpperCase();

  return {
    url: EAPI_URL,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': Object.entries(header)
          .map(([key, value]) => `${key}=${value}`)
          .join('; '),
        'Referer': 'https://music.163.com/',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 9; PCT-AL10) AppleWebKit/537.36 Chrome/70.0.3538.64 Mobile Safari/537.36',
      },
      body: new URLSearchParams({ params }).toString(),
    } satisfies RequestInit,
  };
};
