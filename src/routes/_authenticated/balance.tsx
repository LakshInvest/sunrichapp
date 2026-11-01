import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old "Balance & statement" screen — Khata replaces it. */
export const Route = createFileRoute("/_authenticated/balance")({
  beforeLoad: () => {
    throw redirect({ to: "/khata", replace: true });
  },
});
