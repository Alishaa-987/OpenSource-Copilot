"use client";

import { useState, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * App-wide client providers.
 *
 * - next-themes drives light/dark via the `class` strategy (see globals.css
 *   `@custom-variant dark`). `disableTransitionOnChange` avoids color flashes.
 * - A single QueryClient is created lazily in state so it is stable per render
 *   tree and never shared across requests. Phase 1 uses mock data, but wiring
 *   Query now means pages swap to real endpoints with zero structural change.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
