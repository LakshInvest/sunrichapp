# Building the Sunrich APK on Windows

The APK is a thin "live-site" shell: it loads **https://user.sunrich.in**.
Every feature change you publish appears in the app instantly. Rebuild only to bump the version.

## 1. One-time installs
- Git: https://git-scm.com/download/win
- Node.js 20 LTS: https://nodejs.org
- Android Studio (latest): https://developer.android.com/studio — open it once and let it install the Android SDK.

## 2. Get the code
Open **Command Prompt**:
```
git clone <your GitHub repo URL> sunrich
cd sunrich
npm install
```

## 3. Create the Android project (first time only)
```
npx cap add android
```

## 4. Push notifications file
Copy `google-services.json` (Firebase console → Project settings → Android app `com.sunrich.app`) to:
```
android\app\google-services.json
```
Missing file? The APK still builds and opens; push is just skipped (a log line says so).

## 5. Permissions and notification icon
Open `android\app\src\main\AndroidManifest.xml` and paste above `<application`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<!-- Take a photo for a question, payment screenshot or profile photo -->
<uses-permission android:name="android.permission.CAMERA" />
<!-- Choose a photo from your gallery -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<!-- Pin your delivery address on the map -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- Order, delivery and payment updates -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```
Inside `<application ...>` add:
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_sunrich" />
<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="orders" />
```
Inside the main `<activity>` add (deep links):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="sunrich" android:host="order" />
</intent-filter>
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="user.sunrich.in" android:pathPrefix="/order/" />
</intent-filter>
```
Notification icon: in Android Studio right-click `app\res` → New → Image Asset → *Notification Icons*, name it `ic_stat_sunrich`.
The "Orders" notification channel is created by the app on first use.

Plain-language text shown to users is the Android system prompt plus the app's own "Get order updates?" sheet; location and camera are asked only when the user taps those buttons.

## 6. Sync and open
```
npx cap sync android
npx cap open android
```

## 7. Build the APK
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The file lands at:
```
android\app\build\outputs\apk\debug\app-debug.apk
```
(For Play Store use **Build → Generate Signed Bundle / APK**; see `PLAY_STORE.md`.)

## 8. Install on a phone
1. Copy `app-debug.apk` to the phone (USB, WhatsApp to yourself, or Google Drive).
2. Tap it; allow "Install unknown apps" for that app when asked.
3. Open **Sunrich**.

Or with the phone plugged in (USB debugging on): click the green ▶ Run button in Android Studio.

## Plugins included
@capacitor/app, browser, camera, geolocation, haptics, keyboard, local-notifications, native-settings, network, preferences, push-notifications, share, splash-screen, status-bar (plus core, android, cli).

## Rebuild checklist (keyboard, app-settings, back button)
1. `npm run build` then `npx cap sync android` — this copies the web build and the new plugin (`capacitor-native-settings`) into the Android project.
2. Keyboard behaviour needs no code in the Android project: only Android resizes the window. The app sets the Keyboard plugin to `resize: "none"` (capacitor.config.ts / src/lib/native.ts) so it never resizes a second time. Confirm AndroidManifest's main activity has `android:windowSoftInputMode="adjustResize"`.
3. "Open app settings" (shown when location is permanently refused) uses `capacitor-native-settings` — nothing to configure in the Android project; the plugin opens the system App Details screen itself.
4. Back button is handled in JavaScript (second press on Home within 2 s exits, otherwise the app goes back one screen). No Android-project change is needed.
5. Build: Android Studio → Build → Build APK(s) → install `android\app\build\outputs\apk\debug\app-debug.apk`.

## Domain switch to user.sunrich.in (app opened the browser)
The shell now loads `https://user.sunrich.in`; `allowNavigation` covers `user.sunrich.in`, `*.sunrich.in` and `*.lovable.app` so nothing is treated as an external link. Cleartext stays off.
1. Get the latest code (`git pull`), then `npm install`.
2. `npx cap sync android` — copies the new server URL into `android/app/src/main/assets/capacitor.config.json`.
3. Open `android/app/src/main/AndroidManifest.xml`: in the `https` intent-filter set `android:host="user.sunrich.in"` (replace any `sunrichapp.lovable.app`). Keep the `sunrich://order` filter as is.
4. Search the `android/` folder for `sunrichapp.lovable.app` and replace any hit with `user.sunrich.in`.
5. Raise `versionCode` (and `versionName`) in `android/app/build.gradle`.
6. Android Studio → Build → Build APK(s); uninstall the old app on the phone, then install the new `app-debug.apk`.
7. Check: the app opens inside itself (no browser), login works, and an `https://user.sunrich.in/order/<id>` link opens the order in the app.

## Branded launch (navy splash, no white screen)
The repo has `assets/icon-only.png` (app icon), `assets/splash.png` and `assets/splash-dark.png` (2732×2732, navy #0B2545, logo + "शुद्ध पियो शुद्ध जियो").

1. `git pull` then `npm install` (adds `@capacitor/assets`).
2. Generate the Android icons and splash images (run in the project folder):
   ```
   npx @capacitor/assets generate --android --iconBackgroundColor "#0B2545" --iconBackgroundColorDark "#0B2545" --splashBackgroundColor "#0B2545" --splashBackgroundColorDark "#0B2545"
   ```
3. Android 12+ system splash — create `android/app/src/main/res/values-v31/styles.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <resources>
       <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
           <item name="windowSplashScreenBackground">#0B2545</item>
           <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
           <item name="windowSplashScreenIconBackgroundColor">#0B2545</item>
           <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
           <item name="android:windowBackground">#0B2545</item>
       </style>
   </resources>
   ```
4. In `android/app/src/main/res/values/styles.xml`, inside **both** `<style name="AppTheme.NoActionBar" …>` and `<style name="AppTheme.NoActionBarLaunch" …>` add:
   ```xml
   <item name="android:windowBackground">#0B2545</item>
   ```
   (In `AppTheme.NoActionBarLaunch` keep the existing `android:background` line pointing at `@drawable/splash`.)
5. Add `android/app/src/main/res/values/colors.xml` (or add the line if the file exists):
   ```xml
   <resources>
       <color name="colorPrimary">#0B2545</color>
       <color name="colorPrimaryDark">#0B2545</color>
   </resources>
   ```
6. `npx cap sync android` — copies the new splash settings and the local "No internet — Retry" page (`public/offline.html`).
7. Raise `versionCode`/`versionName` in `android/app/build.gradle`, then Android Studio → Build → Build APK(s). Uninstall the old app, install the new one.
8. Check: tap the icon → navy screen with the logo only → Login/PIN/Home. Airplane mode → navy "No internet — Retry".
