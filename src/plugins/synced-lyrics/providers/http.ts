export const PROVIDER_FETCH_TIMEOUT_MS = 15_000;

export const fetchProvider = (
  input: RequestInfo | URL,
  init: RequestInit = {},
) =>
  fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
  });
