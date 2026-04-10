/** Évite les spinners infinis sur réseau très lent (ex. mobile 4G faible).
 *  Certains WebView Android ne rejettent pas `fetch` après `abort()` : `Promise.race` force une fin.
 */
const DEFAULT_MS = 120_000;

function abortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('The operation was aborted.', 'AbortError');
  }
  return Object.assign(new Error('Aborted'), { name: 'AbortError' });
}

export function createFetchWithTimeout(timeoutMs = DEFAULT_MS): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const p = fetch(input, { ...init, signal: controller.signal }).finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });

    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(abortError());
      }, timeoutMs);
    });

    return Promise.race([p, timedOut]);
  };
}
