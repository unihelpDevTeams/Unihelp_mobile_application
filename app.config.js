const dotenv = require("dotenv");

dotenv.config();

const extra = {
  EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL || "https://unihelp.app",
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "",
  EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY:
    process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "",
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET:
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
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
  eas: {
    projectId: "87a58ee5-c197-4625-9348-1e47e8bf781b",
  },
};

module.exports = {
  expo: {
    name: "UniHelp",
    slug: "unihelpteam",
    owner: "unihelpdevteam",
    version: "1.0.2",
    orientation: "portrait",
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
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zenithdev.unihelp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          "UniHelp uses the microphone so you can record and send voice messages.",
      },
    },
    android: {
      package: "com.zenithdev.unihelp",
      softwareKeyboardLayoutMode: "resize",
      versionCode: 2,
      permissions: ["RECORD_AUDIO"],
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon-square.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon-square.png",
    },
    plugins: [
      "expo-router",
      "expo-notifications",
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
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    updates: {
      url: "https://u.expo.dev/42510ca2-86e1-425d-a072-16c0a5c2feb4",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra,
  },
};