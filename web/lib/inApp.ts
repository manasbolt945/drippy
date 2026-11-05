const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);

/**
 * True inside an app's built-in browser (Instagram, Facebook, Snapchat, TikTok…), e.g. when someone opens
 * Drippy from a story link. Those browsers can't hand files to the share sheet and ignore downloads.
 */
export function isInAppBrowser(agent: string = ua()): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Snapchat|TikTok|musical_ly|Bytedance|Line\/|Twitter|LinkedInApp/i.test(agent);
}

export function isAndroid(agent: string = ua()): boolean {
  return /Android/i.test(agent);
}

/**
 * Android only: a link that reopens `url` in Chrome, leaving the in-app browser behind.
 * If Chrome isn't installed, Android falls back to opening the same page in the default browser.
 */
export function chromeIntentUrl(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
}

const ESCAPED_KEY = "drippy.openedInChrome";

/**
 * On Android in-app browsers, reopen Drippy in Chrome once per visit, where sharing works.
 * Returns true if it tried (the page is about to hand off).
 */
export function escapeInAppBrowserOnce(): boolean {
  if (!isInAppBrowser() || !isAndroid()) return false;
  try {
    if (sessionStorage.getItem(ESCAPED_KEY)) return false; // already tried: if it failed, stay usable here
    sessionStorage.setItem(ESCAPED_KEY, "1");
  } catch {
    return false;
  }
  window.location.href = chromeIntentUrl(window.location.href);
  return true;
}
