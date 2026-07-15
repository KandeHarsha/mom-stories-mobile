import { ConfigContext, ExpoConfig } from 'expo/config';

const packageJson = require('./package.json');

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.harshakande.momstories.dev';
  }

  if (IS_PREVIEW) {
    return 'com.harshakande.momstories.preview';
  }

  return 'com.harshakande.momstories';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'Mom Stories (Dev)';
  }

  if (IS_PREVIEW) {
    return 'Mom Stories (Preview)';
  }

  return 'Mom Stories';
};

const getScheme = () => {
  if (IS_DEV) {
    return 'momstoriesmobile-dev';
  }

  if (IS_PREVIEW) {
    return 'momstoriesmobile-preview';
  }

  return 'momstoriesmobile';
};


export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  "name": getAppName(),
  "slug": "mom-stories-mobile",
  "version": packageJson.version,
  "orientation": "portrait",
  "icon": "./assets/images/icon.png",
  "scheme": getScheme(),
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "jsEngine": "hermes",
  "ios": {
    "jsEngine": "hermes",
    "supportsTablet": true,
    "bundleIdentifier": getUniqueIdentifier(),
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  },
  "android": {
    "jsEngine": "hermes",
    "icon": "./assets/images/icon.png",
    "adaptiveIcon": {
      "backgroundColor": "#E6F4FE",
      "foregroundImage": "./assets/images/icon.png"
    },
    "edgeToEdgeEnabled": true,
    "predictiveBackGestureEnabled": false,
    "package": getUniqueIdentifier(),
    "googleServicesFile": "./google-services.json",
    "permissions": [
      "POST_NOTIFICATIONS",
      "RECORD_AUDIO"
    ]
  },
  "web": {
    "output": "static",
    "bundler": "metro",
    "favicon": "./assets/images/favicon.png"
  },
  "plugins": [
    "expo-router",
    [
      "expo-build-properties",
      {
        "ios": {
          "deploymentTarget": "15.1"
        }
      }
    ],
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/logo-backgroundless.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#ffffff",
        "dark": {
          "backgroundColor": "#000000"
        }
      }
    ],
    "@kingstinct/react-native-healthkit",
    "expo-web-browser",
    "expo-font",
    [
      "expo-notifications",
      {
        "icon": "./assets/images/icon.png",
        "color": "#ffffff",
        "sounds": ["./assets/notification_sound.wav"],
        "mode": "production"
      }
    ],
    [
      "@sentry/react-native/expo",
      {
        "url": "https://sentry.io/",
        "project": "react-native",
        "organization": "mom-stories"
      }
    ],
    [
      "expo-speech-recognition",
      {
        "microphonePermission": "Allow $(PRODUCT_NAME) to use your microphone for voice input.",
        "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to recognize your speech for voice input.",
        "androidSpeechServicePackages": ["com.google.android.googlequicksearchbox"]
      }
    ]
  ],
  "experiments": {
    "typedRoutes": true,
    "reactCompiler": false
  },
  "runtimeVersion": {
    "policy": "fingerprint"
  },
  "updates": {
    "url": "https://u.expo.dev/e106ee42-ff8a-4fcb-acac-12a09ee1f5b4"
  },
  "extra": {
    "router": {},
    "eas": {
      "projectId": "e106ee42-ff8a-4fcb-acac-12a09ee1f5b4"
    }
  },
  "owner": "harshakande"
})
