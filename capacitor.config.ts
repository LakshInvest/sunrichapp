import type { CapacitorConfig } from "@capacitor/cli";

// The app is server-rendered, so the Android shell loads the published site.
const config: CapacitorConfig = {
  appId: "com.sunrich.app",
  appName: "Sunrich",
  webDir: "public",
  server: {
    url: "https://sunrichapp.lovable.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#FFFFFF",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#0B2545",
      style: "DARK",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
