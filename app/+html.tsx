import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/** Matches `APP_CANVAS_BACKGROUND` in `lib/theme.ts` (keep in sync — HTML can't import RN modules). */
const APP_CANVAS_BACKGROUND = "#F9F7F0";

/** Web document shell for `expo export --platform web`. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="seshlogic-web-rev" content="2026-08-15-web-refresh" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body { background-color: ${APP_CANVAS_BACKGROUND}; }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
