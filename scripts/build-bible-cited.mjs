import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");
const bookMapFile = path.join(rootDir, "src", "components", "bookMap.json");
const sourceBibleFile = path.join(rootDir, "bsb-data-pipeline", "bsb.json");
const outputFile = path.join(rootDir, "src", "generated", "bible-cited.json");
const chapterPreviewVerseLimit = 15;

const sourceDirs = [
  path.join(rootDir, "src", "pages"),
  path.join(rootDir, "src", "components"),
  path.join(rootDir, "src", "layouts"),
  path.join(rootDir, "src", "utils"),
];

const sourceExtensions = new Set([".astro", ".md", ".mdx", ".js", ".jsx", ".ts", ".tsx", ".json"]);

const singleChapterBooks = new Set([
  "obadiah",
  "oba",
  "philemon",
  "phm",
  "2jn",
  "3jn",
  "jude",
  "jud",
]);

const bsbCodeOverrides = {
  mrk: "MAR",
  nah: "NAM",
  phm: "PHL",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBookName(bookMap, book) {
  const cleaned = book.replace(/\./g, "");
  return (
    bookMap[book] ??
    bookMap[book.charAt(0).toUpperCase() + book.slice(1)] ??
    bookMap[cleaned] ??
    bookMap[cleaned.charAt(0).toUpperCase() + cleaned.slice(1)]
  );
}

function normalizeReference(bookMap, reference) {
  const lower = reference.trim().toLowerCase().replace(/\u2013|\u2014/g, "-");
  const parts = lower.split(/\s+/);

  if (parts.length < 2) {
    return reference;
  }

  const book = parts.slice(0, -1).join(" ");
  let chapterAndVerse = parts[parts.length - 1];

  if (/^\d+$/.test(chapterAndVerse) && singleChapterBooks.has(book)) {
    chapterAndVerse = `1:${chapterAndVerse}`;
  }

  const normalizedBook = normalizeBookName(bookMap, book);
  if (!normalizedBook) {
    return reference;
  }

  if (/^\d+$/.test(chapterAndVerse) && singleChapterBooks.has(normalizedBook)) {
    chapterAndVerse = `1:${chapterAndVerse}`;
  }

  return `${normalizedBook} ${chapterAndVerse}`;
}

function cleanReference(reference) {
  return String(reference ?? "")
    .replace(/\|.*$/g, "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/(?:,\s*)?&c\.?/gi, "")
    .replace(/(\d+)\s+and\s+(\d+)/gi, "$1, $2")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function normalizeReferenceChunk(bookMap, reference) {
  const cleaned = cleanReference(reference);
  if (!cleaned) {
    return null;
  }

  const normalizedReference = normalizeReference(bookMap, cleaned);
  const match = normalizedReference.match(/^(.+?)\s+(.+)$/);
  if (!match) {
    return null;
  }

  const rawBook = String(match[1] ?? "").toLowerCase();
  const referencePart = String(match[2] ?? "").trim();
  const bookCode = bookMap[rawBook];
  if (!bookCode || !referencePart) {
    return null;
  }

  return `${bookCode} ${referencePart.toLowerCase()}`;
}

function normalizeLookupKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ");
}

function expandReferenceVariants(normalizedReference) {
  const variants = new Set();
  const value = normalizeLookupKey(normalizedReference);
  if (!value) {
    return variants;
  }

  const chapterOnlyMatch = value.match(/^([a-z0-9]+)\s+(\d+)$/);
  if (chapterOnlyMatch) {
    variants.add(value);
    return variants;
  }

  const match = value.match(/^([a-z0-9]+)\s+(\d+):(.+)$/);
  if (!match) {
    return variants;
  }

  variants.add(value);

  const bookCode = match[1];
  const chapter = match[2];
  const versePart = match[3];

  if (!versePart.includes(",")) {
    return variants;
  }

  versePart
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .forEach((piece) => {
      if (piece.includes(":")) {
        variants.add(`${bookCode} ${piece}`);
        return;
      }

      variants.add(`${bookCode} ${chapter}:${piece}`);
    });

  return variants;
}

function toBsbBookCode(bookCode) {
  return bsbCodeOverrides[bookCode] ?? String(bookCode).toUpperCase();
}

function normalizeVersion(value) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return "";
  }

  return cleaned.toUpperCase() === "BSB" ? "" : cleaned;
}

function getEntryParts(entry) {
  if (typeof entry === "string") {
    return { text: entry, version: "" };
  }

  if (entry && typeof entry === "object") {
    const text = typeof entry.text === "string" ? entry.text : "";
    const version = normalizeVersion(entry.version);
    return { text, version };
  }

  return { text: "", version: "" };
}

function resolveVerseData(bible, normalizedReference) {
  const normalizedKey = normalizeLookupKey(normalizedReference);
  const chapterOnlyMatch = normalizedKey.match(/^([a-z0-9]+)\s+(\d+)$/);
  if (chapterOnlyMatch) {
    const bookCode = toBsbBookCode(chapterOnlyMatch[1]);
    const chapterNumber = Number.parseInt(chapterOnlyMatch[2], 10);
    if (Number.isNaN(chapterNumber) || chapterNumber <= 0) {
      return { text: "", version: "" };
    }

    const book = bible[bookCode];
    if (!Array.isArray(book)) {
      return { text: "", version: "" };
    }

    const chapterEntries = book[chapterNumber - 1];
    if (!Array.isArray(chapterEntries)) {
      return { text: "", version: "" };
    }

    const verseTextParts = [];
    let version = "";
    const maxVerse = Math.min(chapterEntries.length, chapterPreviewVerseLimit);
    for (let verseNumber = 1; verseNumber <= maxVerse; verseNumber += 1) {
      const entry = chapterEntries[verseNumber - 1];
      const parts = getEntryParts(entry);
      const cleaned = parts.text.trim();
      if (!cleaned) {
        continue;
      }
      if (!version && parts.version) {
        version = parts.version;
      }
      verseTextParts.push(`${verseNumber} ${cleaned}`);
    }

    if (chapterEntries.length > chapterPreviewVerseLimit && verseTextParts.length) {
      verseTextParts.push("...");
    }

    return { text: verseTextParts.join(" "), version };
  }

  const match = normalizedKey.match(/^([a-z0-9]+)\s+(\d+):(.+)$/);
  if (!match) {
    return { text: "", version: "" };
  }

  const bookCode = toBsbBookCode(match[1]);
  const chapterNumber = Number.parseInt(match[2], 10);
  if (Number.isNaN(chapterNumber) || chapterNumber <= 0) {
    return { text: "", version: "" };
  }

  const book = bible[bookCode];
  if (!Array.isArray(book)) {
    return { text: "", version: "" };
  }

  const chapterEntries = book[chapterNumber - 1];
  if (!Array.isArray(chapterEntries)) {
    return { text: "", version: "" };
  }

  const verseTextParts = [];
  let version = "";
  const segments = String(match[3])
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

  function appendVerse(chapterValue, verseValue) {
    const chapter = book[chapterValue - 1];
    if (!Array.isArray(chapter)) {
      return;
    }

    const entry = chapter[verseValue - 1];
    const parts = getEntryParts(entry);
    const cleaned = parts.text.trim();
    if (!cleaned) {
      return;
    }

    if (!version && parts.version) {
      version = parts.version;
    }

    verseTextParts.push(`${verseValue} ${cleaned}`);
  }

  function appendSegment(chapterValue, segment) {
    const chapterEntriesForValue = book[chapterValue - 1];
    if (!Array.isArray(chapterEntriesForValue)) {
      return;
    }

    if (bookCode === "PSA" && segment.toLowerCase() === "title") {
      appendVerse(chapterValue, 1);
      return;
    }

    const ffMatch = segment.match(/^(\d+)ff$/i);
    if (ffMatch) {
      const start = Number.parseInt(ffMatch[1], 10);
      if (!Number.isNaN(start) && start > 0) {
        for (let verseNumber = start; verseNumber <= chapterEntriesForValue.length; verseNumber += 1) {
          appendVerse(chapterValue, verseNumber);
        }
      }
      return;
    }

    const crossChapterMatch = segment.match(/^(\d+)-(\d+):(\d+)$/);
    if (crossChapterMatch) {
      const startVerse = Number.parseInt(crossChapterMatch[1], 10);
      const endChapter = Number.parseInt(crossChapterMatch[2], 10);
      const endVerse = Number.parseInt(crossChapterMatch[3], 10);
      if (
        !Number.isNaN(startVerse) &&
        !Number.isNaN(endChapter) &&
        !Number.isNaN(endVerse) &&
        startVerse > 0 &&
        endChapter >= chapterValue &&
        endVerse > 0
      ) {
        for (let chapter = chapterValue; chapter <= endChapter; chapter += 1) {
          const chapterEntriesRange = book[chapter - 1];
          if (!Array.isArray(chapterEntriesRange)) {
            break;
          }

          const start = chapter === chapterValue ? startVerse : 1;
          const end = chapter === endChapter ? endVerse : chapterEntriesRange.length;
          for (let verseNumber = start; verseNumber <= end; verseNumber += 1) {
            appendVerse(chapter, verseNumber);
          }
        }
      }
      return;
    }

    const rangeMatch = segment.match(/^(\d+)(?:-(\d+))?$/);
    if (!rangeMatch) {
      return;
    }

    const start = Number.parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? Number.parseInt(rangeMatch[2], 10) : start;
    if (Number.isNaN(start) || Number.isNaN(end) || start <= 0 || end <= 0) {
      return;
    }

    const rangeStart = Math.min(start, end);
    const rangeEnd = Math.max(start, end);
    for (let verseNumber = rangeStart; verseNumber <= rangeEnd; verseNumber += 1) {
      appendVerse(chapterValue, verseNumber);
    }
  }

  for (const segment of segments) {
    const chapterQualifiedMatch = segment.match(/^(\d+):(.+)$/);
    if (chapterQualifiedMatch) {
      const chapterValue = Number.parseInt(chapterQualifiedMatch[1], 10);
      const qualifiedSegment = chapterQualifiedMatch[2].trim();
      if (!Number.isNaN(chapterValue) && chapterValue > 0 && qualifiedSegment) {
        appendSegment(chapterValue, qualifiedSegment);
      }
      continue;
    }

    appendSegment(chapterNumber, segment);
  }

  return { text: verseTextParts.join(" "), version };
}

async function listSourceFiles(dir) {
  const results = [];

  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

function extractRawReferences(content, bookMap) {
  const refs = new Set();

  const bookPattern = Object.keys(bookMap)
    .sort((a, b) => b.length - a.length)
    .map((book) => escapeRegExp(book))
    .join("|");

  const singleChapterBookPattern = [...singleChapterBooks]
    .sort((a, b) => b.length - a.length)
    .map((book) => escapeRegExp(book))
    .join("|");

  const multiVerseSingleChapterRegex = new RegExp(
    `\\b(${singleChapterBookPattern})\\s+(\\d+(?:[-\\u2013\\u2014]\\d+)?)(?:\\s*,\\s*\\d+(?:[-\\u2013\\u2014]\\d+)?)+`,
    "gi"
  );

  const multiVerseRegex = new RegExp(
    `\\b(${bookPattern})\\s+(\\d+):(\\d+(?:[-\\u2013\\u2014]\\d+)?)(?:\\s*,\\s*\\d+(?::\\d+(?:[-\\u2013\\u2014]\\d+)?)?(?:[-\\u2013\\u2014]\\d+)?)+`,
    "gi"
  );

  const singleVerseSingleChapterRegex = new RegExp(
    `\\b(${singleChapterBookPattern})\\s+(\\d+(?:[-\\u2013\\u2014]\\d+)?)\\b`,
    "gi"
  );

  const singleVerseRegex = new RegExp(
    `\\b(${bookPattern})\\s+(\\d+):(\\d+(?:[-\\u2013\\u2014]\\d+)?)\\b`,
    "gi"
  );

  const chapterOnlyRegex = new RegExp(`\\b(${bookPattern})\\s+(\\d+)\\b(?!\\s*:)`, "gi");

  for (const match of content.matchAll(multiVerseSingleChapterRegex)) {
    const whole = match[0] ?? "";
    const book = match[1] ?? "";
    const firstVerse = match[2] ?? "";
    if (!book || !firstVerse) continue;

    refs.add(`${book} ${firstVerse}`);
    const rest = whole.slice(`${book} ${firstVerse}`.length);
    const extraMatches = rest.match(/,\s*\d+(?:[-\u2013\u2014]\d+)?/g) ?? [];
    extraMatches.forEach((chunk) => {
      const verse = chunk.replace(/,\s*/, "");
      refs.add(`${book} ${verse}`);
    });
  }

  for (const match of content.matchAll(multiVerseRegex)) {
    const whole = match[0] ?? "";
    const book = match[1] ?? "";
    const chapter = match[2] ?? "";
    const firstVerse = match[3] ?? "";
    if (!book || !chapter || !firstVerse) continue;

    refs.add(`${book} ${chapter}:${firstVerse}`);
    const rest = whole.slice(`${book} ${chapter}:${firstVerse}`.length);
    const extraMatches = rest.match(/,\s*\d+(?::\d+(?:[-\u2013\u2014]\d+)?)?(?:[-\u2013\u2014]\d+)?/g) ?? [];
    extraMatches.forEach((chunk) => {
      const verse = chunk.replace(/,\s*/, "");
      refs.add(verse.includes(":") ? `${book} ${verse}` : `${book} ${chapter}:${verse}`);
    });
  }

  for (const match of content.matchAll(singleVerseRegex)) {
    const book = match[1] ?? "";
    const chapter = match[2] ?? "";
    const verse = match[3] ?? "";
    if (book && chapter && verse) {
      refs.add(`${book} ${chapter}:${verse}`);
    }
  }

  for (const match of content.matchAll(singleVerseSingleChapterRegex)) {
    const book = String(match[1] ?? "").toLowerCase().replace(/\./g, "");
    const verse = match[2] ?? "";
    if (singleChapterBooks.has(book) && verse) {
      refs.add(`${match[1]} ${verse}`);
    }
  }

  for (const match of content.matchAll(chapterOnlyRegex)) {
    const book = String(match[1] ?? "").toLowerCase().replace(/\./g, "");
    const chapter = match[2] ?? "";
    if (singleChapterBooks.has(book)) continue;
    if (chapter) {
      refs.add(`${match[1]} ${chapter}`);
    }
  }

  return refs;
}

async function run() {
  const [bookMapRaw, bibleRaw] = await Promise.all([
    fs.readFile(bookMapFile, "utf8"),
    fs.readFile(sourceBibleFile, "utf8"),
  ]);

  const bookMap = JSON.parse(bookMapRaw);
  const bible = JSON.parse(bibleRaw);

  const sourceFiles = (await Promise.all(sourceDirs.map((dir) => listSourceFiles(dir)))).flat();
  const allReferences = new Set();

  for (const file of sourceFiles) {
    const raw = await fs.readFile(file, "utf8");
    const refs = extractRawReferences(raw, bookMap);
    refs.forEach((rawReference) => {
      const normalizedKey = normalizeReferenceChunk(bookMap, rawReference);
      if (!normalizedKey) {
        return;
      }

      expandReferenceVariants(normalizedKey).forEach((variant) => allReferences.add(variant));
    });
  }

  const verses = {};
  let missingCount = 0;
  const missingReferences = [];

  [...allReferences]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach((reference) => {
      const verseData = resolveVerseData(bible, reference);
      if (!verseData.text) {
        missingCount += 1;
        missingReferences.push(reference);
        return;
      }

      verses[reference] = verseData.version
        ? { text: verseData.text, version: verseData.version }
        : verseData.text;
    });

  const output = {
    source: "bsb-data-pipeline/bsb.json",
    generatedAt: new Date().toISOString(),
    verseCount: Object.keys(verses).length,
    verses,
  };

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Generated ${Object.keys(verses).length} cited verse lookups (${missingCount} unresolved references skipped).`
  );

  if (process.env.DEBUG_MISSING_BIBLE_REFS === "1" && missingReferences.length) {
    console.log("Unresolved references:");
    missingReferences.forEach((reference) => console.log(`- ${reference}`));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
