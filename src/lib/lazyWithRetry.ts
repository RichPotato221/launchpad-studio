import { lazy, type ComponentType } from "react";

/**
 * React.lazy that survives a failed code download.
 *
 * A section of the portal is downloaded the first time it is opened. If that
 * download fails — flaky connection, or the page is still running an older
 * published version — React shows an error instead of the section. This retries
 * the download with a fresh request, and only then falls back to reloading the
 * page once so the visitor lands on the current version.
 */
const RELOAD_FLAG = "trog:lazy-reload";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
      return mod;
    } catch (err) {
      // Second chance — transient network failures usually clear immediately.
      await new Promise((r) => setTimeout(r, 600));
      try {
        return await factory();
      } catch (retryErr) {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = !!sessionStorage.getItem(RELOAD_FLAG);
          sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {
          /* ignore */
        }
        if (!alreadyReloaded && typeof window !== "undefined") {
          window.location.reload();
          // Keep the promise pending while the page reloads.
          return await new Promise<{ default: T }>(() => {});
        }
        throw retryErr ?? err;
      }
    }
  });
}
