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

- Auth gate lives in `src/routes/_authenticated/route.tsx` (`ssr: false`, redirect to `/auth`); every post-login screen is a child of it. Why: the session lives in browser storage, so gating must run client-side on this external-Supabase project.
- Server reads for signed-in data go through `createServerFn` in `src/lib/` with `.middleware([requireSupabaseAuth])`; the bearer token is attached by `attachSupabaseAuth` in `src/start.ts`. Why: server functions are callable without the route gate.
- All screens apply the saved language on mount via the `useLang` hook (`src/hooks/use-lang.ts`). Why: only the language-picker route seeds the language otherwise.
- Do not create new database tables or edit brands data; the app reads the existing `brands` table only. Why: the backend is user-managed and pre-seeded.
