import { createFileRoute, redirect } from "@tanstack/react-router";

/** Shared product link https://user.sunrich.in/p/<id> → product screen (sign-in first if needed). */
export const Route = createFileRoute("/p/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/product/$id", params: { id: params.id }, replace: true });
  },
  head: () => ({
    meta: [
      { title: "Sunrich — Product" },
      { name: "description", content: "View this Sunrich product and order it in the app." },
      { property: "og:title", content: "Sunrich — Product" },
      { property: "og:description", content: "View this Sunrich product and order it in the app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
