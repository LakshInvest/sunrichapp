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
- Auth gate `src/routes/_authenticated/route.tsx` (`ssr: false`) redirects to `/auth`, signs out when the `user_sessions` row is missing/revoked, and routes by registration status: null/draft/rejected → `/registration`, blocked → `/hold`, active/pending → Home (pending blocks checkout). Why: session lives in browser storage; admins must force logout.
- Signed-in server reads use `createServerFn` + `requireSupabaseAuth`; bearer attached by `attachSupabaseAuth` in `src/start.ts`. Service-role reads first verify caller access through RLS. Why: server fns are callable without the route gate.
- All screens apply the saved language via `useLang`. Offline: mutating screens disable actions and show `offline.hint`; catalogue falls back to cache. Why: patchy mobile data; only the picker seeds language otherwise.
- Form errors use `data-field-error` + `scrollToFirstError()` (`src/lib/form-errors.ts`). Why: consistent jump-to-first-error.
- Shared-order deep links: `sunrich://order/<id>` and `https://…/order/<id>` land on `/order/$id`, which redirects to `/track/$id`; the Android shell maps `appUrlOpen` to the same path (`src/lib/native.ts`). Why: order links must open the order on web and in the app.
- Google Maps runs entirely in the browser (`src/lib/gmaps.ts`): Maps JavaScript (pin drag), the Places library (autocomplete), the Maps JS Geocoder (pin → address) and Static Maps `<img>` previews, all with the website-restricted key from `getMapsBrowserKey` (maps.functions.ts). The server never calls Google; keep it that way — a server-side call is refused by the key's referrer restriction. Why: the referrer check is what authorizes the key.
- User-visible fetch/RPC errors go through `serverMessage(e, fallback)` (`src/lib/form-errors.ts`): network → `errors.network`, technical text (RLS/jwt/pgrst/HTTP codes) → the screen's fallback, >120 chars → fallback, else the raw human message (also logged to console). Why: patchy mobile data and DB jargon must never reach customers.
- Customer-query statuses are inverted from what they read like: `customer_raise_query` inserts status `answered` (= waiting for Sunrich); staff `reply_query` sets `open` (= waiting for the customer). Notifications, badges and "needs action" UI list only `open` queries — a freshly raised query must not trigger a reply notice. Why: the enum is owned by the backend and cannot be renamed.
- Products without a price for the customer's plan (`price === null` from `my_catalogue`) are never orderable: cards show a "Price on request" button that opens the queries chat (`src/lib/price-request.ts`, canonical English subject "Price request: <name> (<pack>)" used to reopen the same chat), the cart marks the line "Price not available", excludes it from totals and blocks checkout until removed, and the backend rejects any unpriced line (`_price_lines` raises "No price set for <name>", mapped to `errors.noPrice`). Why: Prompt-31 business rule; the price lives server-side only.
