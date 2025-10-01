import { normalizeReference } from "../../utils/normalizeRef.js";
import { getVerse } from "../../utils/bibleClient.js";

export async function GET() {
  const tests = [
    "Revelation 12:3",
    "1 John 3:16",
    "Psalm 23:1-2",
    "2 Cor 5:17",
    "Genesis 1:1",
    "Jn 4:24",
    "Jude 1:7",
    "Jude 7"
  ];

  const results = [];
  for (const ref of tests) {
    const normalized = normalizeReference(ref);
    const verse = await getVerse(normalized);
    results.push({
      input: ref,
      normalized,
      verse
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}
