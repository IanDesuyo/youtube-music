import { ProviderNames } from './index';
import { LRCLib } from './LRCLib';
import { LyricsGenius } from './LyricsGenius';
import { NetEase } from './NetEase';
import { QQMusic } from './QQMusic';
import { YTMusic } from './YTMusic';

export const providers = {
  [ProviderNames.NetEase]: new NetEase(),
  [ProviderNames.QQMusic]: new QQMusic(),
  [ProviderNames.YTMusic]: new YTMusic(),
  [ProviderNames.LRCLib]: new LRCLib(),
  [ProviderNames.LyricsGenius]: new LyricsGenius(),
  // [ProviderNames.Megalobiz]: new Megalobiz(), // Disabled because it is too unstable and slow
} as const;
