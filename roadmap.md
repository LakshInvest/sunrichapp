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
