export async function getVerse(ref) {
  // Parse reference: e.g. "1jn 3:16" → book=1jn, chapter=3, verse=16
  const [bookPart, chapAndVerses] = ref.split(" ");
  const [chapter, versePart] = chapAndVerses.split(":");
  const [verseStart, verseEnd] = versePart.split("-").map(v => parseInt(v, 10));

  // Use BSB translation (Fetch.Bible manual API)
  const bibleId = "eng_bsb";
  const url = `https://v1.fetch.bible/bibles/${bibleId}/txt/${bookPart}.json`;
  const res = await fetch(url);
  const data = await res.json();

  const verses = [];
  for (let v = verseStart; v <= (verseEnd || verseStart); v++) {
    const chapterIdx = parseInt(chapter, 10);
    const verseIdx = parseInt(v, 10);
    const pieces = data.contents?.[chapterIdx]?.[verseIdx] || [];

    const verseText = pieces
      .map(piece => {
        if (typeof piece === "string") return piece;
        if (piece.type === "note" || piece.type === "heading") return "";
        return piece.contents || "";
      })
      .join("")
      .trim();

    if (verseText) {
      verses.push(`${v} ${verseText}`);
    }
  }

  // console.log("=== RAW API DATA for", url, "===");
  // console.log(JSON.stringify(data, null, 2).slice(0, 2000)); // first 2k chars

  return verses.join(" ");
}