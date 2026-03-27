export const tokens = {
  spacing: {
    none: 0,
    hairline: 1,
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    "2xl": 32,
    "3xl": 40,
    "4xl": 48,
    "5xl": 64,
    "6xl": 80,
  },
  radius: {
    xs: 10,
    sm: 14,
    md: 18,
    lg: 24,
    xl: 30,
    "2xl": 38,
    pill: 999,
  },
  typography: {
    fontFamily: {
      display: "System",
      body: "System",
      mono: "Courier",
    },
    fontSize: {
      xxs: 10,
      xs: 12,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 38,
      "5xl": 48,
    },
    lineHeight: {
      tight: 1.08,
      snug: 1.2,
      normal: 1.4,
      relaxed: 1.55,
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      black: "800",
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.4,
      wider: 0.8,
      /** Uppercase field labels (e.g. programming form). */
      caps: 0.7,
    },
  },
  layout: {
    /** Minimum tap target (e.g. stepper controls). */
    minTouchTarget: 44,
    chipMinWidth: 46,
    inlineInputMinHeight: 38,
    helpTriggerCompact: 22,
    helpTriggerDefault: 32,
  },
  icon: {
    sm: 15,
    md: 18,
    lg: 22,
  },
  hitSlop: {
    compactHelpVertical: 10,
    compactHelpHorizontal: 6,
  },
  elevation: {
    none: 0,
    sm: 2,
    md: 8,
    lg: 16,
    xl: 24,
  },
  motion: {
    quick: 120,
    normal: 220,
    slow: 320,
    /** Follow-up scroll after keyboard (ms). */
    keyboardScrollRetry: 300,
    /** Longer retry for slow keyboard animations (ms). */
    keyboardScrollRetryLong: 520,
    /** Exercise search / filter debounce (ms). */
    searchDebounce: 300,
    spring: {
      responsive: { damping: 26, stiffness: 300, mass: 0.8 },
      bouncy: { damping: 14, stiffness: 240, mass: 0.9 },
      gentle: { damping: 30, stiffness: 180, mass: 1.0 },
      completion: { damping: 12, stiffness: 200, mass: 0.7 },
    },
  },
  shadow: {
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
    },
    accent: {
      shadowColor: "#F97316",
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
    },
  },
} as const;

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  surfaceRaised: string;
  surfacePressed: string;
  surface: string;
  surfaceAlt: string;
  surfaceMuted: string;
  input: string;
  inputBorder: string;
  inputBorderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  heroText: string;
  heroTextMuted: string;
  primary: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  border: string;
  borderSoft: string;
  borderStrong: string;
  borderAccent: string;
  borderSuccess: string;
  overlay: string;
  overlaySoft: string;
  shadow: string;
  shadowAccent: string;
  shadowSuccess: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
  onSuccess: string;
}

export interface ThemeGradients {
  screenGlowTop: string;
  screenGlowBottom: string;
  heroPrimary: string;
  heroSecondary: string;
  heroAccentStart: string;
  heroAccentEnd: string;
  heroNeutralStart: string;
  heroNeutralEnd: string;
  cardGlowStart: string;
  cardGlowEnd: string;
  surfaceStart: string;
  surfaceEnd: string;
  successStart: string;
  successEnd: string;
  progressStart: string;
  progressEnd: string;
}

export interface AppTheme {
  name: "light" | "dark";
  isDark: boolean;
  tokens: typeof tokens;
  colors: ThemeColors;
  gradients: ThemeGradients;
}
