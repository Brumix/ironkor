import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "production" | "beta" | "development";
const EAS_PROJECT_ID = "0d005082-6c8a-4c7a-94d7-2a999b4609f2";

function resolveAppVariant(appVariant?: string | null): AppVariant {
  if (appVariant === "development") {
    return "development";
  }

  if (appVariant === "beta") {
    return "beta";
  }

  return "production";
}

function getAppBundleIdentifier(variant: AppVariant) {
  switch (variant) {
    case "development":
      return "com.ironkor.development";
    case "beta":
      return "com.ironkor.beta";
    default:
      return "com.ironkor";
  }
}

function getAppName(variant: AppVariant) {
  switch (variant) {
    case "development":
      return "Ironkor Dev";
    case "beta":
      return "Ironkor Beta";
    default:
      return "Ironkor";
  }
}

function getAppIcon(variant: AppVariant) {
  switch (variant) {
    case "development":
      return "./assets/moose_dev.png";
    case "beta":
      return "./assets/moose_beta.png";
    default:
      return "./assets/moose.png";
  }
}

function getWebFavicon(variant: AppVariant) {
  return getAppIcon(variant);
}

function getAppScheme(variant: AppVariant) {
  void variant;
  return "ironkor";
}

function getAppSchemes(variant: AppVariant) {
  return [getAppScheme(variant)];
}

function getAuthRedirectDomain() {
  const value = process.env.EXPO_PUBLIC_AUTH_REDIRECT_DOMAIN?.trim();
  return value && value.length > 0 ? value : null;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = resolveAppVariant(process.env.APP_VARIANT);
  const appIcon = getAppIcon(appVariant);
  const webFavicon = getWebFavicon(appVariant);
  const authRedirectDomain = getAuthRedirectDomain();
  const associatedDomains = authRedirectDomain ? [`applinks:${authRedirectDomain}`] : undefined;
  const intentFilters = authRedirectDomain
    ? [
        {
          action: "VIEW",
          autoVerify: true,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            {
              scheme: "https",
              host: authRedirectDomain,
              pathPrefix: "/callback",
            },
          ],
        },
      ]
    : undefined;

  return {
    ...config,
    name: getAppName(appVariant),
    slug: "ironkor",
    version: "1.0.0",
    orientation: "portrait",
    icon: appIcon,
    scheme: getAppSchemes(appVariant),
    userInterfaceStyle: "automatic",
    ios: {
      ...config.ios,
      icon: appIcon,
      bundleIdentifier: getAppBundleIdentifier(appVariant),
      associatedDomains,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        backgroundColor: "#17120F",
        foregroundImage: appIcon,
      },
      softwareKeyboardLayoutMode: "resize",
      predictiveBackGestureEnabled: false,
      package: getAppBundleIdentifier(appVariant),
      intentFilters,
    },
    web: {
      ...config.web,
      output: "static",
      favicon: webFavicon,
    },
    plugins: [
      "expo-router",
      "expo-image",
      "expo-apple-authentication",
      "expo-web-browser",
      [
        "expo-secure-store",
        {
          faceIDPermission: "Allow Ironkor to unlock your training data with Face ID.",
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#17120F",
          image: getAppIcon(appVariant),
          android: {
            image: getAppIcon(appVariant),
            imageWidth: 76,
          },
        },
      ],
    ],
    experiments: {
      ...config.experiments,
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      ...config.extra,
      router: {
        ...(config.extra?.router ?? {}),
      },
      eas: {
        ...(config.extra?.eas ?? {}),
        projectId: EAS_PROJECT_ID,
      },
    },
    owner: "ironkor",
  };
};
