import { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { darkTheme } from "@/theme/darkTheme";
import { lightTheme } from "@/theme/lightTheme";
import type { AppTheme } from "@/theme/tokens";

import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedThemeMode = Exclude<ThemeMode, "system">;

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ThemeMode, colorScheme: ReturnType<typeof useColorScheme>): ResolvedThemeMode {
  if (mode === "system") {
    return colorScheme === "dark" ? "dark" : "light";
  }

  return mode;
}

export function ThemeProvider({
  children,
  defaultMode = "system",
}: {
  children: ReactNode;
  defaultMode?: ThemeMode;
}) {
  const colorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(defaultMode);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedMode = resolveMode(mode, colorScheme);
    const theme = resolvedMode === "dark" ? darkTheme : lightTheme;

    return {
      theme,
      mode,
      resolvedMode,
      setMode,
      toggleTheme: () => {
        setMode((current) => {
          const currentResolved = resolveMode(current, colorScheme);
          return currentResolved === "dark" ? "light" : "dark";
        });
      },
    };
  }, [colorScheme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
