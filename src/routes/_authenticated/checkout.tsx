import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old pay-while-ordering checkout was replaced by the rate request flow (Prompt-70). */
export const Route = createFileRoute("/_authenticated/checkout")({
  beforeLoad: () => {
    throw redirect({ to: "/cart", replace: true });
  },
});
