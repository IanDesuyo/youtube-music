export const PROVIDER_REQUEST_TIMEOUT_MS = 15_000;

export const prepareProviderRequest = (init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers);

  // Chromium derives Host from the URL. Passing it explicitly to Electron's
  // net.fetch throws net::ERR_INVALID_ARGUMENT before any request is sent.
  headers.delete('host');

  return {
    ...init,
    headers,
    signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
  };
};
