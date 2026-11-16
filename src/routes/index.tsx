import { createFileRoute, redirect } from "@tanstack/react-router";
import en from "@/locales/en.json";
import appIcon from "@/assets/brand/sunrich-app-icon-final.png.asset.json";

// App start goes straight to login: /auth shows the PIN screen for a
// remembered device or the mobile-number step otherwise, and forwards
// already-signed-in users into the app. The old language/welcome intro
// screens were removed (the language pill lives on the login screen).
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: en.metaTitle },
      { name: "description", content: en.metaDescription },
      { property: "og:title", content: en.metaTitle },
      { property: "og:description", content: en.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://user.sunrich.in${appIcon.url}` },
      { name: "twitter:image", content: `https://user.sunrich.in${appIcon.url}` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
