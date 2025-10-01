import bookMap from "../components/bookMap.json";

// Books with only one chapter
const singleChapterBooks = [
  "obadiah", "philemon", "2 john", "3 john", "jude"
];

export function normalizeReference(ref) {
  const lower = ref.toLowerCase().trim();
  console.log("normalizeReference input:", ref, "lower:", lower);

  // Try to match "book chapter:verse" or "book verse"
  const parts = lower.split(" ");
  const book = parts.slice(0, -1).join(" ");
  let chapVerse = parts[parts.length - 1];

  // If it's just a number and the book is single-chapter, prepend "1:"
  if (/^\d+$/.test(chapVerse) && singleChapterBooks.includes(book)) {
    chapVerse = `1:${chapVerse}`;
  }

  // Map book name to 3-letter code
  const code = bookMap[book.charAt(0).toUpperCase() + book.slice(1)] || bookMap[book];
  if (!code) {
    console.warn("Book not recognized:", book);
    return ref; // fallback
  }

  const result = `${code} ${chapVerse}`;
  console.log("result:", result);
  return result;
}
