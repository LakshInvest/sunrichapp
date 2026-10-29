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

- Login is WhatsApp OTP: `src/lib/otp.functions.ts` (public server fns, service-role inside handlers) verifies the code and returns a magic-link token_hash the browser exchanges for a session; the gate in `_authenticated/route.tsx` signs out when the `user_sessions` row is missing or revoked. Why: customers have no passwords and admins must be able to force logout.
- Auth gate lives in `src/routes/_authenticated/route.tsx` (`ssr: false`, redirect to `/auth`); every post-login screen is a child of it. Why: the session lives in browser storage, so gating must run client-side on this external-Supabase project.
- Server reads for signed-in data go through `createServerFn` in `src/lib/` with `.middleware([requireSupabaseAuth])`; the bearer token is attached by `attachSupabaseAuth` in `src/start.ts`. Why: server functions are callable without the route gate.
- All screens apply the saved language on mount via the `useLang` hook (`src/hooks/use-lang.ts`). Why: only the language-picker route seeds the language otherwise.
- Do not create new database tables or edit brands data; the app reads the existing `brands` table only. Why: the backend is user-managed and pre-seeded.
- The Home screen reads ALL content (hero, banners, categories, products, sections) from `src/data/homeContent.ts`, whose shape mirrors the future database tables; product/catalog data lives there, not in sample fixtures. Why: swapping the file for Supabase reads later must not change the Home design.
- Cart quantities are a single `useCart` hook (`src/hooks/use-cart.ts`) persisted in localStorage under `sunrich.cart`, shared by Home's cart bar and the `/cart` screen. Why: the cart must survive reloads and stay in sync across screens.
