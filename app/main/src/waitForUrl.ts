import { net } from 'electron';

/** Poll until HTTP responds (Vite ready) or timeout. */
export async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await net.fetch(url, { bypassCustomProtocolHandlers: true });
      if (res.ok || res.status === 404) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
