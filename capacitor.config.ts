import type { CapacitorConfig } from "@capacitor/cli";

// The app is server-rendered, so the Android shell loads the published site.
const config: CapacitorConfig = {
  appId: "com.sunrich.app",
  appName: "Sunrich",
  webDir: "public",
  server: {
    url: "https://user.sunrich.in",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "user.sunrich.in",
      "*.sunrich.in",
      "*.lovable.app",
      "nxlmiovntfdsunqydrqd.supabase.co",
      "*.supabase.co",
      "maps.google.com",
      "*.google.com",
      "*.googleapis.com",
      "*.gstatic.com",
    ],
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
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_sunrich",
      iconColor: "#2EA3C7",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
