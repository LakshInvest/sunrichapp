import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Shared-order deep link target: https://…/order/<id> and sunrich://order/<id>
 * both land here and hand over to the authenticated order detail screen
 * (which sends unsigned visitors to /auth first).
 */
export const Route = createFileRoute("/order/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/track/$id", params: { id: params.id }, replace: true });
  },
  head: () => ({
    meta: [{ title: "Sunrich — Order" }],
  }),
});
