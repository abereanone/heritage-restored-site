export const BIBLE_ABBREVIATION = "BSB";
const referenceCache = new Map();
let bibleLookupPromise = null;

function normalizeLookupKey(reference) {
  return String(reference ?? "")
    .trim()
    .replace(/\|.*$/g, "")
    .replace(/(\d+)\s+and\s+(\d+)/gi, "$1, $2")
    .toLowerCase()
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function toVerseData(entry) {
  if (typeof entry === "string") {
    const text = entry.trim();
    return text ? { text, version: BIBLE_ABBREVIATION } : null;
  }

  if (!entry || typeof entry !== "object" || typeof entry.text !== "string") {
    return null;
  }

  const text = entry.text.trim();
  if (!text) {
    return null;
  }

  const rawVersion = typeof entry.version === "string" ? entry.version.trim() : "";
  const version = rawVersion || BIBLE_ABBREVIATION;

  return { text, version };
}

async function getBibleLookup() {
  if (!bibleLookupPromise) {
    bibleLookupPromise = import("../generated/bible-cited.json")
      .then((module) => {
        const data = module.default ?? {};
        return new Map(Object.entries(data.verses ?? {}));
      })
      .catch(() => new Map());
  }

  return bibleLookupPromise;
}

export async function getVerseData(rawReference) {
  const normalizedReference = normalizeLookupKey(rawReference);

  if (referenceCache.has(normalizedReference)) {
    return referenceCache.get(normalizedReference);
  }

  const bibleLookup = await getBibleLookup();
  const verseData = toVerseData(bibleLookup.get(normalizedReference));
  referenceCache.set(normalizedReference, verseData);
  return verseData;
}

export async function getVerse(rawReference) {
  const verseData = await getVerseData(rawReference);
  return verseData?.text ?? "";
}
