import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { kokoroPlugin } from "./server/kokoroPlugin";

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    tailwindcss(),
    kokoroPlugin(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "PrepMate",
        short_name: "PrepMate",
        description: "Personal interview practice coach",
        theme_color: "#121c28",
        background_color: "#121c28",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns:
          mode === "production"
            ? ["**/*.{js,css,html,ico,png,svg,webp,woff2,json}"]
            : [],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      },
      injectRegister: null,
      devOptions: {
        enabled: true,
        type: "module"
      }
    })
  ]
}));
