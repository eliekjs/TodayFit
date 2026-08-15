import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

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
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
