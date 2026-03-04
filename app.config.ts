import { ConfigContext, ExpoConfig } from "expo/config";

const IS_BETA = process.env.APP_VARIANT === 'beta';
const IS_DEVELOPMENT = process.env.APP_VARIANT === 'development';

const getUniqueIdentifier = () => {
    if (IS_DEVELOPMENT) {
        return 'com.ironkor.ironkor.development';
    }
    if (IS_BETA) {
        return 'com.ironkor.ironkor.beta';
    }

    return 'com.ironkor.ironkor';
};

const getAppName = () => {
    if (IS_DEVELOPMENT) {
        return 'Ironkor Dev';
    }

    if (IS_BETA) {
        return 'Ironkor Beta';
    }

    return 'Ironkor';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: getAppName(),
    slug: "ironkor-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "ironkormobile",
    userInterfaceStyle: "automatic",
    ios: {
        icon: "./assets/expo.icon",
        bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
        adaptiveIcon: {
            backgroundColor: "#E6F4FE",
            foregroundImage: "./assets/images/android-icon-foreground.png",
            backgroundImage: "./assets/images/android-icon-background.png",
            monochromeImage: "./assets/images/android-icon-monochrome.png"
        },
        predictiveBackGestureEnabled: false,
        package: getUniqueIdentifier(),
    },
    web: {
        output: "static",
        favicon: "./assets/images/favicon.png"
    },
    plugins: [
        "expo-router",
        [
            "expo-splash-screen",
            {
                backgroundColor: "#208AEF",
                android: {
                    image: "./assets/images/splash-icon.png",
                    imageWidth: 76
                }
            }
        ]
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true
    },
    extra: {
        router: {},
        eas: {
            "projectId": "2a1abc75-b947-44ee-a54e-c17d1a732b49"
        }
    },
    owner: "ironkor"
})