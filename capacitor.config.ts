import type { CapacitorConfig } from "@capacitor/cli";

// The app is server-rendered, so the Android shell loads the published site.
const config: CapacitorConfig = {
  appId: "com.sunrich.app",
  appName: "Sunrich",
  webDir: "public",
  server: {
    url: "https://user.sunrich.in",
    cleartext: false,
    // Local navy "No internet — Retry" page instead of a WebView error.
    errorPath: "offline.html",
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
    backgroundColor: "#0B2545",
  },
  plugins: {
    SplashScreen: {
      // Hidden from JS once Login/PIN/Home has rendered (src/lib/native.ts).
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#0B2545",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#0B2545",
      style: "DARK", // DARK = light icons on the navy bar
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
