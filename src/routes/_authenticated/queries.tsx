import { Outlet, createFileRoute } from "@tanstack/react-router";
import en from "@/locales/en.json";

export const Route = createFileRoute("/_authenticated/queries")({
  head: () => ({
    meta: [
      { title: en.queries.metaTitle },
      { name: "description", content: en.queries.metaDescription },
      { property: "og:title", content: en.queries.metaTitle },
      { property: "og:description", content: en.queries.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QueriesLayout,
});

function QueriesLayout() {
  return <Outlet />;
}
