import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  integrations: [react(), sitemap()],
  site: "https://heritagerestored.org",
  vite: {
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client"],
    },
  },
});
