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
      return "com.ironkor.ironkor.development";
    case "beta":
      return "com.ironkor.ironkor.beta";
    default:
      return "com.ironkor.ironkor";
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
  switch (variant) {
    case "development":
      return "ironkormobile-dev";
    case "beta":
      return "ironkormobile-beta";
    default:
      return "ironkormobile";
  }
}
