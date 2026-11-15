
# Route rules

- Segment-nested routes need a layout rendering `<Outlet/>` with the list in `*.index.tsx` (see track, queries). Why: otherwise child paths render the parent.
- Route files must not import helpers from other route files. Why: keeps the route tree clear.
- `/auth` beforeLoad redirect is skipped while `sessionStorage` `sunrich.authflow` is set (cleared in `routeAfterLogin`). Why: otherwise Set PIN is skipped on new devices.
- Account/queries read `customer_queries`/`customer_query_messages`/`user_profiles` via the browser client (RLS-scoped); replies via `reply_query`; attachments to `customer-docs` at `<customer_id>/queries/<timestamp>-<file>`; name/photo via `update_my_profile`. Why: existing schema only.
- Cart is the single `useCart` hook persisted under `sunrich.cart`. Why: survives reloads, synced across screens.
- Home top is one 4:3 `app_hero` photo with location chip + bell (no titles); the search bar is the curved top of the content; one `SmartCard` (`src/lib/smart-card.ts`: overdue > out for delivery > reorder, ✕ keyed by situation). Why: Prompt-52 layout + Prompt-35 single-card rule.
- Home category tiles open `/category/$code` (no "All" tile); tiles live in `components/catalog/CategoryTiles.tsx` (cutout check, else first product image with multiply). Why: Prompt-51 Bisleri-style tiles.
