"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const isClient = typeof window !== "undefined";
  // React 19 warns about executable <script> tags inside components on the client.
  // SSR keeps the default type so the inline script runs before paint; client uses
  // application/json so React does not treat it as an executable script.
  const scriptProps = isClient
    ? ({ type: "application/json" } as const)
    : undefined;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={scriptProps}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
