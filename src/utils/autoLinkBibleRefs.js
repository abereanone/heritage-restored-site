import bookMap from "../components/bookMap.json";

// Build a dynamic regex from your bookMap keys
const bookNames = Object.keys(bookMap)
  .sort((a, b) => b.length - a.length) // longest first
  .join("|");

// Example: (?:genesis|gen|ge|exodus|exo|ex|...)
const refRegex = new RegExp(
  `\\b(${bookNames})\\s+(\\d+:\\d+(?:[-–]\\d+)?)\\b`,
  "gi"
);

export function autoLinkBibleRefs(text) {
  return text.replace(refRegex, (match, book, chapVerse) => {
    const ref = `${book} ${chapVerse}`;
    return `<span class="bible-ref" data-ref="${ref}">${match}</span>`;
  });
}
