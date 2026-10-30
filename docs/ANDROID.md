# Sunrich Android release notes

## Version
Version name and code live in `src/lib/version.ts` (`APP_VERSION`, `APP_VERSION_CODE`, app id `com.sunrich.app`).
Bump both, then mirror them in `android/app/build.gradle` (`versionName`, `versionCode`) before each Play upload.
The server values in `public_app_info` (latest / minimum version, Play URL, maintenance) drive the in-app update and maintenance screens.

## Permissions used and why
| Permission | Why |
| --- | --- |
| INTERNET | Ordering, sign-in, sync |
| CAMERA | Photo for a question, payment screenshot, profile photo (only when the user taps) |
| ACCESS_FINE_LOCATION / COARSE | Pin delivery address on the map (only when the user taps "Use my location") |
| POST_NOTIFICATIONS (Android 13+) | Order updates — asked only after the user accepts our "Get order updates?" sheet |

No background location, contacts, SMS or storage-wide permissions.

## Push notifications
Uses `@capacitor/push-notifications` (Firebase Cloud Messaging). Add `google-services.json` to `android/app/` before building.
The device token is saved with `save_my_push_token` (device id, platform, app, language) and refreshed on sign-in and language change.
A push may carry `data.url` (for example `/track/<order id>`); tapping it opens that screen.

## Play Console checklist
- Privacy policy URL: `https://sunrichapp.lovable.app/privacy`
- Account deletion URL: `https://sunrichapp.lovable.app/delete-account`
- Terms: `https://sunrichapp.lovable.app/terms`
- Reviewer login: the demo shop account (UI only — do not place real orders with it).
- Data safety: phone number, name, address, location (optional), photos (optional), order and payment history. Encrypted in transit. Deletion on request.

## Build
```
npm run build
npx cap sync android
npx cap open android   # then Build > Generate Signed Bundle
```
