/**
 * Recovery for stale page code.
 *
 * After a new version is published, a browser that is still running the old
 * page can ask for a piece of code that no longer exists. The request fails,
 * nothing renders and the visitor is left with a blank screen — often with no
 * usable error attached (it surfaces as "Uncaught undefined").
 *
 * This listens for those failures and reloads the page once, so the visitor
 * simply lands on the current version instead of a blank screen.
 */

const RELOAD_FLAG = "trog:chunk-reload";

function looksLikeStaleCode(value: unknown): boolean {
  const message =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "message" in value
        ? String((value as { message?: unknown }).message ?? "")
        : "";
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|error loading dynamically imported/i.test(
    message,
  );
}

function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* private mode — reload anyway */
  }
  window.location.reload();
}

export function installChunkRecovery() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __trogChunkRecovery?: boolean };
  if (w.__trogChunkRecovery) return;
  w.__trogChunkRecovery = true;

  // A successful load means the current code is good; clear the guard.
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }

  window.addEventListener("error", (event) => {
    if (looksLikeStaleCode(event.error ?? event.message)) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (looksLikeStaleCode(event.reason)) reloadOnce();
  });
}
