
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

// --------------------------------------------------
// GOOGLE SERVICES CONFIGURATION
// --------------------------------------------------

const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON || "./google-services.json";

const googleServicesPath = path.resolve(
  process.cwd(),
  googleServicesFile
);

const googleServicesConfig = fs.existsSync(googleServicesPath)
  ? JSON.parse(fs.readFileSync(googleServicesPath, "utf8"))
  : null;

// Get the Web OAuth client ID from .env or google-services.json
const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  googleServicesConfig?.client
    ?.flatMap((client) => client.oauth_client || [])
    .find((client) => client.client_type === 3)?.client_id ||
  "";

// Get the Android OAuth client matching UniHelp's package name
const googleAndroidClientId =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  googleServicesConfig?.client
    ?.find(
      (client) =>
        client.client_info?.android_client_info?.package_name ===
        "com.zenithdev.unihelp"
    )
    ?.oauth_client?.find((oauthClient) => oauthClient.client_type === 1)
    ?.client_id || "";
const googleAndroidClientConfigured = Boolean(
  googleAndroidClientId
);

// iOS Google Sign-In configuration
const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

// --------------------------------------------------
// EXPO EXTRA CONFIGURATION
// --------------------------------------------------

const extra = {
  EXPO_PUBLIC_APP_URL:
    process.env.EXPO_PUBLIC_APP_URL || "https://unihelp.app",

  EXPO_PUBLIC_API_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    "https://unihelp-backend-dg0o.onrender.com",

  EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY:
    process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "",

  EXPO_PUBLIC_GOOGLE_PLAY_PRODUCT_IDS:
    process.env.EXPO_PUBLIC_GOOGLE_PLAY_PRODUCT_IDS ||
    "unihelp_premium_monthly,unihelp_premium_yearly",

  EXPO_PUBLIC_FIREBASE_API_KEY:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",

  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",

  EXPO_PUBLIC_FIREBASE_PROJECT_ID:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",

  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",

  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",

  EXPO_PUBLIC_FIREBASE_APP_ID:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",

  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",

  googleWebClientId,
  googleAndroidClientId,
  googleAndroidClientConfigured,
  googleIosClientId,

  eas: {
    projectId: "87a58ee5-c197-4625-9348-1e47e8bf781b",
  },
};

const easProjectId = extra.eas.projectId;

// --------------------------------------------------
// EXPO CONFIGURATION
// --------------------------------------------------

module.exports = {
  expo: {
    name: "UniHelp",
    slug: "unihelpteam",
    owner: "unihelpdevteam",
    version: "1.1.0",

    orientation: "default",

    icon: "./assets/images/icon-square.png",

    scheme: "unihelp",

    userInterfaceStyle: "automatic",

    newArchEnabled: true,

    splash: {
      image: "./assets/images/icon-square.png",
      resizeMode: "cover",
      backgroundColor: "#ffffff",
    },

    assetBundlePatterns: ["**/*"],

    // --------------------------------------------------
    // IOS CONFIGURATION
    // --------------------------------------------------

    ios: {
      supportsTablet: true,

      bundleIdentifier: "com.zenithdev.unihelp",

      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,

        NSMicrophoneUsageDescription:
          "UniHelp uses the microphone so you can record and send voice messages.",
      },
    },

    // --------------------------------------------------
    // ANDROID CONFIGURATION
    // --------------------------------------------------

    android: {
      package: "com.zenithdev.unihelp",

      googleServicesFile,

      softwareKeyboardLayoutMode: "resize",

      versionCode: 10,

      permissions: [
        "RECORD_AUDIO",
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM",
      ],

      adaptiveIcon: {
        foregroundImage: "./assets/images/icon-square.png",
        backgroundColor: "#ffffff",
      },

      edgeToEdgeEnabled: true,

      predictiveBackGestureEnabled: true,

      intentFilters: [
        {
          action: "VIEW",

          autoVerify: true,

          data: [
            {
              scheme: "https",
              host: "unihelp.app",
            },
            {
              scheme: "http",
              host: "unihelp.app",
            },
            {
              scheme: "unihelp",
              host: "*",
            },
          ],

          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },

    // --------------------------------------------------
    // WEB CONFIGURATION
    // --------------------------------------------------

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon-square.png",
    },

    // --------------------------------------------------
    // PLUGINS
    // --------------------------------------------------

    plugins: [
      "expo-router",

      "expo-sharing",

      "expo-font",

      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow UniHelp to access your photos so you can add images to your profile, groups, posts, and messages.",

          cameraPermission:
            "Allow UniHelp to use your camera so you can take photos to share in messages.",
        },
      ],

      [
        "expo-build-properties",
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],

      "expo-iap",

      [
        "expo-notifications",
        {
          icon: "./assets/images/icon-square.png",
          color: "#ffffff",
          defaultChannel: "default",
        },
      ],

      "@react-native-community/datetimepicker",

      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon-square.png",
          imageWidth: 200,
          resizeMode: "cover",
          backgroundColor: "#ffffff",
        },
      ],
    ],

    // --------------------------------------------------
    // EXPERIMENTS
    // --------------------------------------------------

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    // --------------------------------------------------
    // EAS UPDATES
    // --------------------------------------------------

    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
    },

    // --------------------------------------------------
    // RUNTIME VERSION
    // --------------------------------------------------

    runtimeVersion: {
      policy: "appVersion",
    },

    // --------------------------------------------------
    // EXTRA
    // --------------------------------------------------

    extra,
  },
};
