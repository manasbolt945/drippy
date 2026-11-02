import { ImageResponse } from "next/og";
import { LOGO_SVG_SQUARE, logoDataUrl } from "./logo";

// One drawing for the favicon, the PWA icons and the iOS home-screen icon.
export function renderIcon(size: number) {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoDataUrl(LOGO_SVG_SQUARE)} alt="" width={size} height={size} />
    ),
    { width: size, height: size },
  );
}
