# Sunrich — Play Store release notes

Build steps live in `docs/ANDROID.md`. This file covers the store listing itself.

## App identity
- App name: **Sunrich**
- Package / application id: `com.sunrich.app`
- Version name / code: from `src/lib/version.ts` (`APP_VERSION` / `APP_VERSION_CODE`) — the single source; mirror it in `android/app/build.gradle`.
- Category: Shopping · Food & Beverages (packaged drinking water delivery)

## Store listing text (short)
Order packaged drinking water from Sunrich Foods. Browse products, place
delivery or pickup orders, track them live, pay by UPI/COD and manage your
account — in English, हिंदी or मराठी.

## Permissions and why each is needed
| Permission | Why the app needs it |
|---|---|
| Internet | All data comes from the Sunrich servers (catalogue, orders, bills). |
| Post notifications (Android 13+) | Only if the customer says yes to "Get order updates?" — order approval, delivery and bill alerts. Asked in-app first, never on first open. |
| Camera | Optional: attach a photo to a support question or a payment proof. Only opens from a button the customer taps. |
| Photos / media | Pick an existing photo for the same attachments. |
| Location (coarse) | Optional: pick the delivery address on the map. Only opens from the address picker. |
| No other sensitive permissions are requested. |

## Data collected (matches the Privacy Policy at /privacy)
- **Account data:** mobile number, shop/customer name, address, language.
- **Order data:** products ordered, delivery address, delivery/pickup details, delivery photos and signatures (proof of delivery).
- **Support data:** questions, replies and attachments the customer sends.
- **Payments data:** bills, payments recorded by Sunrich, payment proofs the customer submits.
- **Device data:** a random device id (login trust + push token), app version.
- Data is never sold; only Sunrich staff and the assigned distributor see order details.

## Reviewer login (Play Store demo)
- Mobile: `9999900000` · PIN: `1234`
- Opens the PIN screen directly (no WhatsApp OTP is sent for this number).
- This account is UI-only: order checkout is disabled, orders cannot be placed.
- Public pages for review: `https://sunrichapp.lovable.app/privacy`,
  `/terms`, `/delete-account` (no login needed).

## Deep links to test
- `sunrich://order/<order-id>` — opens that order's detail screen.
- `https://sunrichapp.lovable.app/order/<order-id>` — same, on web and in-app.
- Register both in `android/app/src/main/AndroidManifest.xml`
  (`intent-filter` with scheme `sunrich`, host `order`; App Links for https),
  then open the order detail / track list after sign-in.

## Notification tap routing
Push payloads carry `url` (e.g. `/track/<id>`); tapping opens that screen.
