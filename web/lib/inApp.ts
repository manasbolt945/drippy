/**
 * True inside an app's built-in browser (Instagram, Facebook, Snapchat, TikTok…), e.g. when someone opens
 * Drippy from a story link. Those browsers can't hand files to the share sheet and ignore downloads,
 * but they do let you press and hold an image to save it.
 */
export function isInAppBrowser(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Snapchat|TikTok|musical_ly|Bytedance|Line\/|Twitter|LinkedInApp/i.test(ua);
}
