// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Offline/speed cache. Registered only by src/lib/sw-register.ts (published site only).
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false,
        filename: "sw.js",
        outDir: "dist/client",
        devOptions: { enabled: false },
        workbox: {
          globDirectory: "dist/client",
          // Hashed JS/CSS/fonts/images: precached per deploy (versioned by the hash list).
          globPatterns: ["assets/**/*.{js,css,woff,woff2,png,jpg,jpeg,webp,svg}", "*.{png,svg,ico}"],
          globIgnores: ["**/jspdf*", "**/html2canvas*", "**/purify*"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
          runtimeCaching: [
            {
              // App pages: network first, phone copy when the network is slow/down.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                url.origin === self.location.origin &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/api/") &&
                !url.pathname.startsWith("/_serverFn"),
              handler: "NetworkFirst",
              options: {
                cacheName: "sunrich-pages",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 },
              },
            },
            {
              // Product / banner images from storage.
              urlPattern: ({ url }) =>
                url.pathname.includes("/storage/v1/object/public/") ||
                url.pathname.includes("/storage/v1/render/image/public/") ||
                url.pathname.startsWith("/__l5e/assets-v1/"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "sunrich-images",
                expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com" || url.origin === "https://fonts.googleapis.com",
              handler: "CacheFirst",
              options: {
                cacheName: "sunrich-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Data always comes from the network (never a stale price or balance).
              urlPattern: ({ url }) => url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/auth/v1/"),
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
  },
});
