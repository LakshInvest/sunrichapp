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
