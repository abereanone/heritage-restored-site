import { normalizeReference } from "../utils/normalizeRef.js";
import { useEffect } from "react";
import { getVerse } from "../utils/bibleClient.js";

export default function BibleHover() {
  useEffect(() => {
    const refs = document.querySelectorAll(".bible-ref");

    async function handleHover(e) {
      const el = e.currentTarget;

      // If already has tooltip, just show it
      if (el.dataset.loaded && el._tooltip) {
        el._tooltip.style.display = "block";
        return;
      }

      try {
        const ref = normalizeReference(el.dataset.ref);
        const verse = await getVerse(ref);

        // Create tooltip element
        const tooltip = document.createElement("div");
        tooltip.className = "bible-tooltip";
        tooltip.textContent = verse || "Verse not found";
        document.body.appendChild(tooltip);

        // Position tooltip
        function positionTooltip() {
          const rect = el.getBoundingClientRect();

          // Make sure we can measure the tooltip
          tooltip.style.visibility = "hidden";
          tooltip.style.display = "block";

          const tooltipWidth = tooltip.offsetWidth;
          const viewportWidth = window.innerWidth;

          // Hide again until we decide to show
          tooltip.style.display = "none";
          tooltip.style.visibility = "visible";

          let left = rect.left + window.scrollX;
          if (left + tooltipWidth > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth - 10;
          }
          if (left < 10) {
            left = 10; // keep some padding on the left side too
          }

          tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
          tooltip.style.left = `${left}px`;
        }

        positionTooltip();

        // Save reference so we don’t recreate
        el._tooltip = tooltip;
        el.dataset.loaded = "true";

        // Show immediately
        tooltip.style.display = "block";

        // Hide when mouse leaves
        el.addEventListener("mouseleave", () => {
          tooltip.style.display = "none";
        });
      } catch (err) {
        console.error("Error fetching verse:", err);
      }
    }

    refs.forEach((el) => el.addEventListener("mouseenter", handleHover));

    return () => {
      refs.forEach((el) => el.removeEventListener("mouseenter", handleHover));
    };
  }, []);

  return null;
}
