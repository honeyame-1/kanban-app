import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/kanban-app/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "업무 칸반",
        short_name: "칸반",
        description: "개인 업무 관리 칸반 보드",
        theme_color: "#6366f1",
        background_color: "#0f0f1a",
        display: "standalone",
        start_url: "/kanban-app/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
