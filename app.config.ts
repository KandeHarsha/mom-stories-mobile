import { ConfigContext, ExpoConfig } from 'expo/config';

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


export default({config}: ConfigContext):ExpoConfig => ({
  ...config,
  "name": getAppName(),
  "slug": "mom-stories-mobile",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/images/icon.png",
  "scheme": "momstoriesmobile",
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
    "adaptiveIcon": {
      "backgroundColor": "#E6F4FE",
      "foregroundImage": "./assets/images/android-icon-foreground.png",
      "backgroundImage": "./assets/images/android-icon-background.png",
      "monochromeImage": "./assets/images/android-icon-monochrome.png"
    },
    "edgeToEdgeEnabled": true,
    "predictiveBackGestureEnabled": false,
    "package": getUniqueIdentifier()
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
    "expo-web-browser"
  ],
  "experiments": {
    "typedRoutes": true,
    "reactCompiler": false
  },
  "runtimeVersion": {
    "policy": "appVersion"
  },
  "updates": {
    "url": "https://u.expo.dev/6191c5e8-06ba-470a-a0db-303018204760"
  },
  "extra": {
    "router": {},
    "eas": {
      "projectId": "e106ee42-ff8a-4fcb-acac-12a09ee1f5b4"
    }
  },
  "owner": "harshakande"
})
