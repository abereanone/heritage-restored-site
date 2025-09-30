import { normalizeReference } from "./normalizeRef.js";

// Improved regex: handles multi-word names, hyphen or en dash
const refRegex = /\b([1-3]?\s?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+:\d+(?:[-–]\d+)?)/g;

export function autoLinkBibleRefs(text) {
  return text.replace(refRegex, (match, book, versePart) => {
    // normalize en dash → hyphen
    const cleaned = versePart.replace("–", "-");

    const ref = `${book} ${cleaned}`;
    const normalized = normalizeReference(ref);

    return `<span class="bible-ref" data-ref="${normalized}">${match}</span>`;
  });
}
