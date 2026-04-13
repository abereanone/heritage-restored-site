import { normalizeReference } from "../utils/normalizeRef.js";
import { useEffect } from "react";
import { getVerseData } from "../utils/bibleClient.js";

export default function BibleHover() {
  useEffect(() => {
    const refs = document.querySelectorAll(".bible-ref");

    async function handleHover(e) {
      const el = e.currentTarget;

      if (el.dataset.loaded && el._tooltip) {
        el._tooltip.style.display = "block";
        return;
      }

      try {
        const ref = normalizeReference(el.dataset.ref);
        const verse = await getVerseData(ref);

        const tooltip = document.createElement("div");
        tooltip.className = "bible-tooltip";
        tooltip.textContent = verse ? `${verse.text} (${verse.version})` : "Verse not found";
        document.body.appendChild(tooltip);

        function positionTooltip() {
          const rect = el.getBoundingClientRect();

          tooltip.style.visibility = "hidden";
          tooltip.style.display = "block";

          const tooltipWidth = tooltip.offsetWidth;
          const viewportWidth = window.innerWidth;

          tooltip.style.display = "none";
          tooltip.style.visibility = "visible";

          let left = rect.left + window.scrollX;
          if (left + tooltipWidth > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth - 10;
          }
          if (left < 10) {
            left = 10;
          }

          tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
          tooltip.style.left = `${left}px`;
        }

        positionTooltip();

        el._tooltip = tooltip;
        el.dataset.loaded = "true";
        tooltip.style.display = "block";

        el.addEventListener("mouseleave", () => {
          tooltip.style.display = "none";
        });
      } catch (err) {
        console.error("Error loading verse:", err);
      }
    }

    refs.forEach((el) => el.addEventListener("mouseenter", handleHover));

    return () => {
      refs.forEach((el) => el.removeEventListener("mouseenter", handleHover));
    };
  }, []);

  return null;
}
