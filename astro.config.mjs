import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  site: "https://heritagerestored.org",
  vite: {
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client"],
    },
  },
});