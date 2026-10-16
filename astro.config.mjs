import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  integrations: [sitemap()],
  site: "https://heritagerestored.org",
  // Astro 7 defaults to "jsx", which drops the line break between text and an inline
  // tag ("enjoy<a>x</a>and" renders as "enjoyxand"). true keeps the Astro 6 behaviour.
  compressHTML: true,
});
