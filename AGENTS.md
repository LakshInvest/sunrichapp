<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

Subdirectories `src/lib/` and `src/routes/` have their own `AGENTS.md`; read them before changing files there.

- Backend is user-managed and pre-seeded: never create or alter tables, functions, policies or buckets; use existing RPCs/RLS only. Why: the schema is owned outside this app.
- Login is WhatsApp OTP or a device PIN; both return a magic-link token_hash the browser exchanges for a session, then call `record_login`. New numbers self-register (auth user `<mobile>@app.sunrich.local` + `user_profiles`, company `SUNRICH`). Why: customers have no passwords and must be able to sign up.
- PIN is device-bound: `set_my_pin` is required after OTP unless the device is trusted (decided server-side in `verifyOtp`) or "Forgot PIN" was tapped; any 4 digits accepted. `sunrich_device_id`/`sunrich_last_mobile` (localStorage + cookie backup) are never cleared on logout. Why: PIN login must survive logout and storage loss.
- Auth gate `src/routes/_authenticated/route.tsx` (`ssr: false`) redirects to `/auth`, signs out when the `user_sessions` row is missing/revoked, and routes by registration status: null/draft/rejected → `/registration`, blocked → `/hold`, active/pending → Home; pending is sent away from cart/checkout. It also sets the rate lock (`src/lib/rate-lock.ts`): any non-active status hides rates/Add in product cards and detail. Why: session lives in browser storage; rates are shown only after approval.
- Signed-in server reads use `createServerFn` + `requireSupabaseAuth`; bearer attached by `attachSupabaseAuth` in `src/start.ts`. Service-role reads first verify caller access through RLS. Why: server fns are callable without the route gate.
- All screens apply the saved language via `useLang`. Offline: mutating screens disable actions and show `offline.hint`; catalogue falls back to cache. Why: patchy mobile data; only the picker seeds language otherwise.
- Form errors use `data-field-error` + `scrollToFirstError()` (`src/lib/form-errors.ts`). Why: consistent jump-to-first-error.
- Shared-order deep links: `sunrich://order/<id>` and `https://…/order/<id>` land on `/order/$id`, which redirects to `/track/$id`; the Android shell maps `appUrlOpen` to the same path (`src/lib/native.ts`). Why: order links must open the order on web and in the app.
- Google Maps runs entirely in the browser (`src/lib/gmaps.ts`): Maps JavaScript (pin drag), the Places library (autocomplete), the Maps JS Geocoder (pin → address) and Static Maps `<img>` previews, all with the website-restricted key from `getMapsBrowserKey` (maps.functions.ts). The server never calls Google; keep it that way — a server-side call is refused by the key's referrer restriction. Fallbacks show `getMapsError()` (Google's console code). Why: the referrer check authorizes the key; errors are only visible on the phone.
- User-visible fetch/RPC errors go through `serverMessage(e, fallback)` (`src/lib/form-errors.ts`): network → `errors.network`, technical text (RLS/jwt/pgrst/HTTP codes) → the screen's fallback, >120 chars → fallback, else the raw human message (also logged to console). Why: patchy mobile data and DB jargon must never reach customers.
- Customer-query statuses are inverted from what they read like: `customer_raise_query` inserts status `answered` (= waiting for Sunrich); staff `reply_query` sets `open` (= waiting for the customer). Notifications, badges and "needs action" UI list only `open` queries — a freshly raised query must not trigger a reply notice. Why: the enum is owned by the backend and cannot be renamed.
- Products without a price for the customer's plan (`price === null` from `my_catalogue`) are never orderable: cards show a "Price on request" button that opens the queries chat (`src/lib/price-request.ts`, canonical English subject "Price request: <name> (<pack>)" used to reopen the same chat), the cart marks the line "Price not available", excludes it from totals and blocks checkout until removed, and the backend rejects any unpriced line (`_price_lines` raises "No price set for <name>", mapped to `errors.noPrice`). Why: Prompt-31 business rule; the price lives server-side only.
- Bottom tab bar renders only on the main tabs (Home, Shop, Orders, Account, plus Inbox for distributors); inner screens get a back-arrow header and put sticky action bars at `bottom-0` with safe-area padding. Why: the tab bar collided with inner screens' action bars.
- Keyboard-safe layout: `installViewportVars()` (`src/lib/keyboard.ts`, mounted in `__root`) publishes `--app-h`/`--kb` from `visualViewport`; full-height screens (chat) size to `var(--app-h)` with an inner `data-scroll-area` scroller; Android `adjustResize` is the only resize (Keyboard plugin resize `none`); JS only reads the size and scrolls the focused field above `data-kb-bar` bars. Why: fixed bars vanished behind the keyboard.
- Location requests go through `locateDevice()` (`src/lib/native.ts`), which returns `denied`/`off` instead of throwing; the picker shows its own sheet for each with a manual-pin fallback. Why: customers must never see raw GPS errors or get stuck.
- Launch: `LaunchSplash` (in `__root` shell, server-rendered) draws the native splash frame (same logo crop, CENTER_CROP math) then plays a 2 s animation; the native navy splash stays until `markFirstScreen()` (src/lib/native.ts; called by Login, Home and the root on the first settled route), max 8 s; `AppLoader` renders plain navy inside the app. Offline in the shell shows local `public/offline.html` (Capacitor `server.errorPath`). Why: no white screens or double loaders on launch.
- Speed caches (service worker, gate cache, SWR copies): see `src/lib/AGENTS.md`. Checkout prices always come from the server quote. Why: instant opens on slow 4G.

