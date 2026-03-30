export type AppVariant = "production" | "beta" | "development";

export function resolveAppVariant(appVariant?: string | null): AppVariant {
  if (appVariant === "development") {
    return "development";
  }

  if (appVariant === "beta") {
    return "beta";
  }

  return "production";
}

export function getAppBundleIdentifier(variant: AppVariant) {
  switch (variant) {
    case "development":
      return "com.ironkor.development";
    case "beta":  
      return "com.ironkor.beta";
    default:
      return "com.ironkor";
  }
}

export function getAppName(variant: AppVariant) {
  switch (variant) {
    case "development":
      return "Ironkor Dev";
    case "beta":
      return "Ironkor Beta";
    default:
      return "Ironkor";
  }
}

export function getAppScheme(variant: AppVariant) {
  void variant;
  return "ironkor";
}

export function getAppSchemes(variant: AppVariant) {
  return [getAppScheme(variant)];
}
