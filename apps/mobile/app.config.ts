import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "production" | "beta" | "development";

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
      return "com.ironkor.ironkor.development";
    case "beta":
      return "com.ironkor.ironkor.beta";
    default:
      return "com.ironkor.ironkor";
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

function getAppScheme(variant: AppVariant) {
  switch (variant) {
    case "development":
      return "ironkormobile-dev";
    case "beta":
      return "ironkormobile-beta";
    default:
      return "ironkormobile";
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = resolveAppVariant(process.env.APP_VARIANT);

  return {
    ...config,
    name: getAppName(appVariant),
    slug: "ironkor-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/moose.png",
    scheme: getAppScheme(appVariant),
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/moose.png",
      bundleIdentifier: getAppBundleIdentifier(appVariant),
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#17120F",
        foregroundImage: "./assets/moose.png",
      },
      softwareKeyboardLayoutMode: "resize",
      predictiveBackGestureEnabled: false,
      package: getAppBundleIdentifier(appVariant),
    },
    web: {
      output: "static",
      favicon: "./assets/moose.png",
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
          image: "./assets/moose.png",
          android: {
            image: "./assets/moose.png",
            imageWidth: 76,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "2a1abc75-b947-44ee-a54e-c17d1a732b49",
      },
    },
    owner: "ironkor",
  };
};
