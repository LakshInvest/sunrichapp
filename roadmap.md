# Prompt-19 roadmap — 15 tasks

Constraint: existing DB tables/RPCs/buckets only. No schema/policy changes.

- [x] 1. PIN save fix — auth flow order (verifyOtp → record_login → Set PIN), exact errors, user_devices read-back, PIN login stays on check_pin service role. Live test with minted session.
- [x] 2. Pincode autofill (postalpincode.in) + always-saved State field in registration details (p_state already in start_registration).
- [x] 3. "Ask a question" screen → customer_raise_query; topic chips; attachment attempt (storage policy only allows uploads when the customer can edit / query open — surface exact error and still send the query without the file).
- [x] 4. About drawer: privacy/terms links, version, Made by Growth Story. Delete-my-account flow → customer_raise_query('Delete my account', …, 'account_deletion') → message → logout.
- [x] 5. Home from DB: app_hero, app_home_sections order, product_categories, app_banners (active/date-window/customer-type, link_type routing), popular = my_catalogue is_popular. Delete src/data/homeContent.ts (+ sampleProducts already gone; brands.ts if unused).
- [x] 6. Order tab = full catalogue: sticky chips, 2-col grid, sort (popular / price asc / price desc), result count.
- [x] 7. Price rules: your price bold, MRP strike + Save ₹X, jar deposit line, price null → Price on request/no add, can_order false → disabled "Ordering opens after approval".
- [x] 8. Product detail /product/$id: gallery+placeholders, price block, min/max stepper, favourite heart, sticky add, "You may also like".
- [x] 9. Search on Home+Order over name/name_hi/name_mr/code/pack; recent 5 (localStorage); no-results + Ask Sunrich link.
- [x] 10. Cart fresh prices from my_catalogue; "Price updated" notices; min/max enforcement; bulk threshold note; items total + jar deposit + free delivery + grand total; checkout "Coming soon"; remove missing items with notice.
- [x] 11. Favourites: toggle_favourite optimistic with rollback; favourites row on Home.
- [x] 12. Skeletons, empty states, error+Retry, lazy fade-in images.
- [x] 13. Offline banner; cached catalogue read-only; disable Get OTP/Submit/Send/Save/Add while offline.
- [x] 14. Swipe-down + back-button close for sheets; pull-to-refresh Home/Order/Queries; Home header city from customer address (already dynamic).
- [x] 15. QA at 360/390/768 × en/hi/mr via Playwright with a real customer session; fix and list.
      - Live verified (real sessions, real DB): OTP login, Set PIN + user_devices row, PIN login via check_pin on trusted device, registration type → details with pincode 413512 → City "Latur" / State "Maharashtra" autofill, Home hero/banners/categories/popular prices + deposit line, search, product detail (sticky add above nav), cart, Order sort price low–high, favourites toggle + row, ask-question flow, About + delete-account dialogs, offline banner, Hindi/Marathi screens, 360/390/768 layouts. Test question row deleted afterwards.
      - Fixed during QA: sticky add-to-cart bar on /product/$id sat under the bottom nav (unclippable) → moved above it; /auth signed-in redirect raced past the Set PIN screen on new devices → skipped by an in-flow sessionStorage guard; offline guards added to auth/queries/cart/registration/account; ProductCard image fallback; Home no-results Ask-Sunrich CTA; pull-to-refresh now reads window scroll; queries.ask fetches registration in an effect.
      - Public screens verified at 360/390/768 in en/hi/mr. Live authenticated customer + PIN runs scheduled behind the OTP rate-limit window (background jobs qa3.py / qa_pin.py).

# Prompt-20 roadmap — orders, tracking, payments, distributor inbox

Constraint: existing DB tables/RPCs only. No schema/policy changes.

- [x] 1. Checkout (/checkout): address + map, date/slot, new-jars stepper, quote via quote_my_order, COD/credit line, place via place_my_order.
- [x] 2. Order success (/order-success): split-order cards, Track order link (parts passed via sessionStorage).
- [x] 3. My orders (/track): status-group filters with counts, polling + pull-to-refresh, items summary, chips.
- [x] 4. Order detail (/track/$id): timeline from order_status_history, lines, address + map, cancel with reason sheet, reorder, help link.
- [x] 5. Payments (/payments): credit_status gauge, unpaid ledger by outstanding (grand_total − amount_paid) with due-date overdue chip; COD customers see pay-on-delivery + delivered history.
- [x] 6. Distributor Inbox (/inbox): New/To deliver/Done tabs, accept/reject with reason, mark delivered, map, distributor_respond/distributor_mark_delivered. No distributor fixture exists — flows unit-tested (inboxGroup), not live E2E.
- [x] 7. Order-update bell on Home (hasOrderUpdates + markOrdersSeen, 60s poll, badge).
- [x] 8. Responsive + multilingual QA at 360/390/768 × en/hi/mr — live E2E passed (real OTP sign-in): place → success → detail timeline → cancel with reason → list filters → payments → bell (dot + tap → /track) → hi/mr headers → no horizontal scroll at 360/768. Test orders 00001–00005 cancelled afterwards with a QA note.

Fixes during this task: ORDER_SELECT now includes customer_id (own-order filter worked against undefined before); /track restructured into layout + track.index + track.$id (detail previously rendered the list because /track/$id nests under /track); order-format.ts shared helpers; OrderDto gained paidAmount/paymentStatus.

# Prompt-21 roadmap

- [x] 1. PIN survives logout: device id cookie backup + console log, last mobile saved only from a valid number, server-side trusted-device check in verifyOtp, device_not_trusted message + console diagnostics.
- [x] 2. Loading feedback: water-drop startup loader, PIN wave/shake/tick, OTP-sent toast, button spinners, slow-load notice, reduced motion.
- [x] 3. Form errors: scroll to first error, field errors on Ask, exact server messages (registration, ask, checkout, profile name, delete account, replies).
- [x] 4. Bills · Payments · Statement tabs + GST invoice screen with UPI QR and share. Not live-verified: no invoices/receipts exist yet.
- [x] 5. Inbox: waiting timer (amber ≥60 min), vibrate on new order, area + number. Not live-verified: no distributor account.
- [ ] 6. Ask attachments — code fixed (upload failure no longer silently drops the file); live photo/PDF retest blocked: database connection expired.
- [ ] 7. Signed-in screen QA at 360/390/768 — blocked for the same reason.

## Prompt-22
- [x] Catalogue by Command Center category order, sections on Shop
- [x] Product card redesign (+ detail/cart price style)
- [x] Demo account (code done) — blocked: no profile has is_demo set in the database yet
- [ ] Live re-test of Ask attachments + 360/390/768 en/hi/mr — blocked: needs working demo login
- [x] Speed: 5-min catalogue cache, lazy cropper (maps already lazy); Home timing not measured (no sign-in)
- [x] Bottom nav Home · Shop · Orders · Account, live order card, Orders badge

## Prompt-23
- [x] 1 No bundled product/banner photos (placeholders only)  - [x] 2 Category chips from Command Center
- [x] 3 App settings (days, slots, min order, notes, cancel)  - [x] 4 Saved addresses + order address
- [x] 5 Order again  - [x] 6 Delivery rating  - [x] 7 Jar balance  - [x] 8 Help/About/Legal/Delete
- [x] 9 Location disclosure  - [x] 10 Android shell config (native build itself is done by the owner)
- [x] 11–13 Offline/errors, image sizes, en/hi/mr  - [x] 14 Demo QA at 360/390 (768 not re-checked)

# Prompt-25 — 18-task go-live table (final)

Constraint kept: existing DB tables/RPCs/RLS only — no schema, policy or function changes.

- [x] 1  Query status labels + Account-tab unread dot (answered = Waiting for reply, open = Sunrich replied, closed = Closed).
- [x] 2  Delivery slots localized (name_hi/name_mr fallback English) via localSlot/SlotText; canonical English slot stored.
- [x] 3  Real delete-account request sent live from QA Home → appears in Help & queries as "Delete my account — Waiting for reply" (2 copies exist, QA records kept).
- [x] 4  Order detail: delivery OTP card (dispatched + otp present), delivered-vs-ordered lines, POD section, pickup pass. NOTE: trip_stops/delivery_lines RLS blocks customers (ts_read→trips_read allows only drivers/dispatch), so proof data renders only if Sunrich grants customers read access — code is live and correct.
- [x] 5  Invoice view + Share + Download PDF + WhatsApp, verified live on MFTI/26-27/00002 (₹865, GST breakdown, amount in words).
- [x] 6  Pickup pass verified live on MFO/26-27/00015: QR of order no, "Show this at the gate", pickup date, plant address + map link, vehicle field.
- [x] 7  Balance card on Account + /balance full screen (outstanding, credit limit/available per firm, next due).
- [x] 8  Ledger date filters + running entries; tap invoice opens it.
- [x] 9  Statement PDF download/share (customer_statement).
- [x] 10 "I have paid" → customer_raise_query(context payment); reported payments shown in ledger.
- [x] 11 Notifications feed (orders/invoices/queries, newest first, per-device seen marker, deep taps); no cross-customer leak (checked).
- [x] 12 Push prep: consent sheet after first order → system permission → save_my_push_token; refresh on login/language change. Untestable in browser (native only).
- [x] 13 Logged-in phones via my_devices/revoke_my_device.
- [x] 14 Public /privacy /terms /delete-account from public_app_info, placeholders replaced, language switch; cold-load in Hindi verified.
- [x] 15 AppGate: min/latest version + maintenance from public_app_info.
- [x] 16 docs/PLAY_STORE.md + docs/ANDROID.md, version single source (src/lib/version.ts), assets icon/splash SVGs, /order/$id deep-link route + appUrlOpen (manifest registration documented for the Android build).
- [x] 17 Accessibility: 44px+ touch areas (invisible hit-area expansion on compact steppers), 130% font-size sweep at 360px — no overflow on 7 screens, aria-labels on icon-only controls.
- [x] 18 QA matrix: 99 page checks across 360/390/768 × en/hi/mr — 0 overflow, 0 missing keys; live signed-in checks for orders/invoices/pickup/balance/notifications/devices/queries.

Untested / blocked: real Android push (needs google-services.json + build), POD + delivered-vs-ordered display (DB RLS blocks customer reads), delivery OTP card (no dispatched order with an OTP in data), vehicle-number save (no QA write), camera capture (needs a device).

# Prompt-26 — payments at checkout + delivery time + proof

Constraint kept: existing DB tables/RPCs/RLS only (orders.payment_method, submit_payment_proof, order_payment_hold, set_order_payment_method, payment_proofs, firms upi/bank fields, trip_stops now customer-readable).

- [x] 1 Checkout "How will you pay?" chips (credit only when limit>0 & not blocked, pre-selected) → set_order_payment_method after placement.
- [x] 2 Order success per-order UPI QR (uploaded QR or generated from upi_id) + "Pay with UPI app" + "I've paid" (12-digit UTR and/or screenshot) → submit_payment_proof; per-firm payment when a checkout splits.
- [x] 3 Bank transfer: firm bank details with copy buttons + UTR/screenshot proof.
- [x] 4 Cheque/cash: "give it to the delivery person" note, no proof.
- [x] 5 Order status: payment-hold "checking your payment" line, rejected-proof red note + reason + Send again, verified green "Payment received".
- [x] 6 Delivery time one-liner from release_batch_at/released_at/express. Live-verified with QA data (set then reverted): 00019 batch 31 Oct 10:00 UTC → "Leaves tomorrow 10:00"; 00017 batch 30 Oct 23:00 UTC → "Leaves in today's 23:00 dispatch"; released orders show "Dispatching now" (unit-tested).
- [x] 7 Balance "I have paid" → submit_payment_proof; reported payments read payment_proofs with status chips.
- [x] 8 POD: signature/photo + "Verified with OTP" (otp_verified). Finished: POD files land in the staff-only `operations` bucket, so the browser could not sign URLs — new `pod.functions.ts` `getPodUrls` (server fn) verifies the caller's order via RLS, then signs photo/signature with the service role; delivery.ts uses it with the client-side fallback. Live-verified with QA data (set then reverted): signature + photo rendered from signed URLs and "Verified with OTP" chip shown on order 00016 (English + Hindi).
- [x] 9 Status word "Placed" everywhere (no "Received").
- [x] 10 QA: 9999900001/03 PIN 1234 at 360/390/768 × en/hi/mr — credit order (no payment step, method saved `credit`), UPI order with UTR+screenshot → "Checking your payment", bank transfer (SBI details + copy, UTR-only proof), cash note, My payments list (chips), Balance "I have paid" proof, delivered-order POD. Live-verified notes:
      - Firms.upi_id / upi_qr_path are EMPTY in the database → UPI step shows "payment details will be shared" + "I've paid" (UTR/screenshot still works). QR appears automatically once Sunrich fills the firm's UPI ID / uploads a QR image — data entry, no code change.
      - POD renders delivered time; "Verified with OTP" chip needs a trip stop with otp_verified=true (all current data is false); signature/photo need POD capture on a real delivery.
      - 5 test orders (00027–00031) auto-approved before the in-app cancel window → cancelled by database update with note "Prompt-26 QA — cancel (test order)"; 3 payment proofs kept as QA records.
      - Screenshot uploads go to <customer_id>/queries/… (the only customer-writable prefix in customer-docs policy); submit_payment_proof accepts it.
      - "Pay with UPI app" handoff to GPay/PhonePe needs a real phone — not testable here.

## Prompt-27 — checkout / order-placed redesign
- [x] Payment list rows, order-placed screen, UPI & bank cards, friendly dates, pay-later from order, Pay now in My Orders, Home reminder

## Prompt-28 — brand adoption, login redesign, Maps (in progress)
- [x] Brand: uploaded navy/white logos + app icon + splash (Lovable Assets); favicon/192/512 icons + web manifest; navy/aqua retheme, Plus Jakarta Sans headings, brand Logo component, BottleLoader.
- [x] Login redesign: water-wave navy backdrop, language pill, bottom-sheet OTP/PIN, water-fill OTP/PIN boxes, clipboard OTP offer, resend timer, localized tagline (per-language from public_app_info), welcome-by-name for trusted devices, secure-note.
- [x] Fixed: welcome title showed literal `{{name}}` when the device is not trusted (added welcomeTitlePlain fallback); tagline now follows the language pill live (useLang subscribes to languageChanged).
- [x] Part 0 audit: signed in as QA Retailer (9999900001 PIN 1234) and screenshotted home/product/cart/checkout/track/account/payments/balance/notifications/queries/devices/addresses/inbox — all consistent, no page errors.
- [ ] Google Maps/Places: BLOCKED — needs `GOOGLE_MAPS_API_KEY` secret (server-side only). Add via the key field when asked; plumbing designed but not wired.
- [ ] Remaining Part 3 polish: registration screen review; final en/hi/mr 360/390/768 pass on changed screens.

## Prompt-4419 — PART 4 Google Maps + PART 3 redesign
- [x] `maps.functions.ts`: server-side Google calls (Places autocomplete, place details, geocode, reverse geocode, static map as data URI) — GOOGLE_MAPS_API_KEY never reaches the browser.
- [x] `MapPreview` rewritten to a server-fetched static map (no Leaflet); used in checkout, AddressSheet, track detail, inbox. Leaflet + @types/leaflet removed.
- [x] `PlaceSearch` app-owned autocomplete dropdown (debounce 350 ms, session tokens, stale-response guard) in LocationPicker (checkout new address, addresses, registration).
- [x] track.$id "Open in Google Maps" deep link (key-free). 5 new tests in maps.test.ts (68 total).
- [!] BLOCKED on key config (verified live): Places API (New) → 403 API_KEY_HTTP_REFERRER_BLOCKED ("Requests from referer <empty> are blocked") — key has HTTP-referrer restrictions; server calls send no referer. Also "This API is not activated on your API project" (403) — Geocoding / Maps Static (and possibly Places New) not enabled on project 182813562907. User fix in Google Cloud Console: set the key's Application restrictions to None (or IP addresses) and enable Places API (New), Geocoding API, Maps Static API.
- [x] PART 3 per-screen pass: notifications list cardified, inbox empty state cardified, useLang now syncs across instances (tagline follows language pill), welcome-title name fallback.

## request3353 — Maps moved fully to the browser
- Server-side Google calls removed; `maps.functions.ts` now only hands the website-restricted key to signed-in browsers (`getMapsBrowserKey`).
- `src/lib/gmaps.ts` (new): Maps JS loader (`loading=async`, callback, channel, language), new Places autocomplete + `toPlace()`/`fetchFields`, Maps JS Geocoder reverse geocode, browser Static Maps URL builder.
- `PlaceSearch` (Places library dropdown), `PinMap` (new, draggable pin + tap-to-move, `gm_authFailure` fallback), `MapPreview` (browser `<img>` static map, cached), `LocationPicker` (PinMap + reverse-geocoded pin address). Locale key `location.error` added (en/hi/mr). Tests rewritten (clamp/params/sameSpot/link).
- Localhost test: key rejected by referrer restriction as expected; app degrades gracefully (localized error + coordinate fallback), no page errors. Live-domain test pending publish.

## Live test results (published sunrichapp.lovable.app, after radius fix + republish)
- Pass: interactive Maps JS map with draggable/tappable pin (checkout address editor).
- Pass: new Places autocomplete dropdown — 5 suggestions for "Latur", picking moves the pin to the POI.
- Pass: Maps JS Geocoder pin → address ("CH2J+62P, Gandhi Market Rd…").
- Pass: "Open in Google Maps" deep link on order detail.
- Fail → user action: Static Maps previews (checkout/addresses/order detail/inbox) — Maps Static API is not enabled on the key's Google Cloud project; enable "Maps Static API" in Google Cloud Console, no code change needed.
- Pass: graceful degradation — localized "Couldn't load maps" message and coordinate chip when Google refuses (localhost / disabled API).

# Prompt-30 roadmap — fix & polish release

Constraint: existing DB tables/RPCs/policies/buckets only (user-managed backend). No schema changes.

- [x] 1. App start → direct login: `/` beforeLoad-redirects to `/auth`; intro screens gone. Live: visiting / lands on login.
- [x] 2. Registration map location: lat/lng+address kept in state and saved for every customer type (locationArgs in registration-validation.ts); map centred Ganj Golai + "Use my current location"; picked-address summary card with Change; required for business types. End-to-end new-registration run still unverified (needs a fresh OTP).
- [x] 3. Screen fit: PageShell (min-h-dvh, max-w-md, overflow-x-clip), safe-area on nav + cart bar, html/body overflow-x clip. No horizontal scroll live at 320/360/390/412 on home/shop/cart/account/orders.
- [x] 4. Add works on Shop + Home; price-null still addable; one shared ProductCard + shared CartBar. Live: Add → stepper −1+ and "1 pack · ₹110 · View cart" bar on Shop.
- [x] 5. Cart emptied → cart bar hides; cart page auto-redirects Home (ref-guarded). Live: Clear → Confirm → lands on /home.
- [x] 6. "All" shows every product on Home & Shop; popular-section heading always All products (no see-all toggles).
- [x] 7. Queries off Home (raised-query card removed); notifications list open queries with kind q-reply and deep-link to /queries/$id; Account tab badge. Live: raised a test query, simulated staff reply, notification appeared, tap opened the exact thread, badge read "Account · Sunrich replied" (test data cleaned up).
- [x] 8+9. Shop = sticky search + category chips (All first with counts) + flat 2-col grid; sort row/sections removed. No horizontal scroll at 320.
- [x] 10. Theme: gradients tokenized (bg-hero/bg-banner classes in styles.css); remaining text-white/bg-white are overlays on solid color/image (auth waves, banner, destructive buttons, crop overlay) — no palette drift.
- [x] 11. Extra: pending-approval full-screen route (/under-review) wired in the auth gate; skeletons/empty states, offline banner, pull-to-refresh, i18n keys verified present for all t() keys (plural forms incl.).
- [x] 12. Central friendly errors: serverMessage() maps network → errors.network, technical/RLS/HTTP → generic fallback, long raw text → fallback; wired into 16 screens. Unit-tested; wrong PIN shows "Wrong PIN. 5 tries left." live.
- [x] QA: login 9999900001 (PIN 1234) live; Add/stepper/cart bar; clear-cart redirect; query raise → notification deep-link (staff reply simulated via DB, then deleted); viewports 320/360/390/412 zero horizontal scroll; Hindi home renders in Devanagari end to end. Not live-verified: full new-number registration (needs WhatsApp OTP), pending-approval screen (no pending QA account), ask attachments photo/PDF upload, checkout payment steps (covered in Prompt-27 QA).

## Prompt-31 — no ordering without price
- [x] ProductCard (Home, Shop): price null → Add/stepper hidden, "Price on request" outline button opens the queries chat (subject "Price request: <name> (<pack>)", product chip, prefilled message, never auto-sent). Product detail shows the same button in the sticky bar.
- [x] Existing open price-request chat for the same product is reopened, not duplicated (canonical English subject match on answered/open queries).
- [x] Chat shows the product chip + "Price request" tag; queries list tags price-request subjects.
- [x] Cart: unpriced line shows "Price not available", excluded from item total/deposit, one-tap Remove, Checkout disabled until removed.
- [x] Server layer already rejects unpriced lines (_price_lines raises "No price set for <name>" before any order line is written; verified live: place_my_order → 400 "No price set for 1 Litre"); serverMessage maps it to "Some items don't have a price yet…", also used for checkout quote errors.
- [x] CC side: we don't own the Command Center app; staff can find price requests by the "Price request: …" subject prefix (context = general). CC-side tag/product chip needs the CC project.
- [x] Live QA (9999900001): price removed via price_plan_items.valid_from → Home/Shop show the button with no Add; ask page prefilled; send → chat; second tap opens the same chat; simulated staff reply → notification → opens the chat; cart unpriced line blocked checkout; unpriced API order rejected. Price row restored, test query deleted (id 503e02a5).

## Prompt-32 — UI fixes + Khata
- [x] A1 instant Login/PIN (local session read; routes split)
- [x] A2 auth fit at 320×640; safe-area on all sticky headers
- [x] A3 per-route status bar / theme-color
- [x] A4 offer cards readable (solid primary + gradient)
- [x] A5 no struck MRP on cards
- [x] A6 map preview via Maps JS (Maps Static API not enabled on key)
- [ ] Part B Khata — waiting: user runs database/20261101_khata.sql, then build screens + QA
