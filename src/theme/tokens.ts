import { Platform } from "react-native";

const retroFontFamily = Platform.select({
  ios: "Courier",
  android: "monospace",
  default: "monospace",
});

export const tokens = {
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
    "4xl": 40,
    "5xl": 48,
  },
  radius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    pill: 999,
  },
  typography: {
    fontFamily: {
      display: retroFontFamily,
      body: retroFontFamily,
    },
    fontSize: {
      xs: 11,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      "2xl": 22,
      "3xl": 28,
      "4xl": 34,
    },
    lineHeight: {
      tight: 1.15,
      normal: 1.35,
      relaxed: 1.55,
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      black: "800",
    },
  },
  elevation: {
    none: 0,
    sm: 1,
    md: 2,
    lg: 4,
  },
  motion: {
    quick: 120,
    normal: 220,
    slow: 320,
  },
} as const;

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  border: string;
  borderStrong: string;
  overlay: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
}

export interface ThemeGradients {
  screenGlowTop: string;
  screenGlowBottom: string;
  heroPrimary: string;
  heroSecondary: string;
}

export interface AppTheme {
  name: "light" | "dark";
  isDark: boolean;
  tokens: typeof tokens;
  colors: ThemeColors;
  gradients: ThemeGradients;
}
