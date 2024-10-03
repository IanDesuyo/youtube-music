import { createPlugin } from '@/utils';

import { t } from '@/i18n';

export default createPlugin({
  name: () => t('plugins.auto-close-popup.name'),
  restartNeeded: false,
  config: {
    enabled: false,
    timeout: 5000,
  },

  menu: async ({ getConfig, setConfig }) => {
    const timeoutList = [1000, 1500, 3000, 5000, 10000];

    const config = await getConfig();

    return [
      {
        label: t('plugins.auto-close-popup.menu.timeout'),
        submenu: timeoutList.map((timeout) => ({
          label: t('plugins.auto-close-popup.menu.timeout.seconds', {
            timeout: timeout / 1000,
          }),
          type: 'radio',
          checked: config.timeout === timeout,
          click() {
            setConfig({ timeout });
          },
        })),
      },
    ];
  },
  renderer: {
    observer: null as MutationObserver | null,

    async start({ getConfig }) {
      const config = await getConfig();

      this.observer = new MutationObserver((records) => {
        records.forEach((record) => {
          const nodes = record.addedNodes;

          nodes.forEach((node) => {
            const el = node as HTMLElement & { close: () => void }; // YTM built in close method

            // el should have 'ytmusic-popup-container' class
            if (!el.classList.contains('ytmusic-popup-container')) return;

            setTimeout(() => el.close(), config.timeout);
          });
        });
      });
    },

    stop(_context) {
      if (this.observer) {
        this.observer.disconnect();
      }

      this.observer = null;
    },
  },
});
