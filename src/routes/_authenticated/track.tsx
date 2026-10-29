import { Outlet, createFileRoute } from "@tanstack/react-router";
import { OfflineBanner } from "@/components/OfflineBanner";
import en from "@/locales/en.json";
import { useLang } from "@/hooks/use-lang";

/**
 * Layout route for /track. The My orders list lives in track.index.tsx and
 * the order detail (tracking timeline) in track.$id.tsx.
 */
export const Route = createFileRoute("/_authenticated/track")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.track.metaTitle },
      { name: "description", content: en.track.metaDescription },
      { property: "og:title", content: en.track.metaTitle },
      { property: "og:description", content: en.track.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackLayout,
});

function TrackLayout() {
  const { lang } = useLang();
  return (
    <div className={`min-h-screen bg-background ${lang === "en" ? "" : "font-deva"}`}>
      <OfflineBanner />
      <Outlet />
    </div>
  );
}
