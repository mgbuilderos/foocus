"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// We can just omit typing or import it natively if it exists, or just use any type if it's strictly a wrapper
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
