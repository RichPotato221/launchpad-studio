/**
 * Single source of truth for the public portal URL.
 *
 * Every email link, deep link and action URL must be built from this value —
 * never hardcode a project/preview URL anywhere else in the codebase.
 */
const FALLBACK_BASE_URL = "https://trog-leadershipdomain.lovable.app";

function readEnv(): string | undefined {
  // Server (TanStack server functions / server routes)
  if (typeof process !== "undefined" && process.env && process.env["APP_BASE_URL"]) {
    return process.env["APP_BASE_URL"];
  }
  // Browser build-time
  try {
    const v = (import.meta as any)?.env?.VITE_APP_BASE_URL;
    if (v) return v as string;
  } catch {
    /* ignore */
  }
  return undefined;
}

export const APP_BASE_URL = (readEnv() ?? FALLBACK_BASE_URL).replace(/\/+$/, "");

/** Build an absolute portal URL from a path such as "/events". */
export function appUrl(path = "/"): string {
  return `${APP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const ORGANISATION_NAME = "TRoGKC Leadership Portal";
