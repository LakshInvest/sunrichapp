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
    meta: [
      { title: "Sunrich — Shared Order" },
      { name: "description", content: "View your shared Sunrich order and delivery status." },
      { property: "og:title", content: "Sunrich — Shared Order" },
      { property: "og:description", content: "View your shared Sunrich order and delivery status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
