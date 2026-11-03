import { createFileRoute, redirect } from "@tanstack/react-router";

/** Shop was merged into Home; old links land on Home. */
export const Route = createFileRoute("/_authenticated/order")({
  beforeLoad: () => {
    throw redirect({ to: "/home", replace: true });
  },
});
