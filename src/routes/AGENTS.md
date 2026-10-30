
# Route rules

- Segment-nested routes need a layout rendering `<Outlet/>` with the list in `*.index.tsx` (see track, queries). Why: otherwise child paths render the parent.
- Route files must not import helpers from other route files. Why: keeps the route tree clear.
- `/auth` beforeLoad redirect is skipped while `sessionStorage` `sunrich.authflow` is set (cleared in `routeAfterLogin`). Why: otherwise Set PIN is skipped on new devices.
- Account/queries read `customer_queries`/`customer_query_messages`/`user_profiles` via the browser client (RLS-scoped); replies via `reply_query`; attachments to `customer-docs` at `<customer_id>/queries/<timestamp>-<file>`; name/photo via `update_my_profile`. Why: existing schema only.
- Cart is the single `useCart` hook persisted under `sunrich.cart`. Why: survives reloads, synced across screens.
