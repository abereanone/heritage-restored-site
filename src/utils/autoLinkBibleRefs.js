import bookMap from "../components/bookMap.json";

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
const continuedVerseRegex = /([;]\s*)(\d+:\d+(?:[-\u2013\u2014]\d+)?)(?=(?:\s*[;),.]|\s*$))/g;

function linkBibleRefsText(text) {
  const withChapterOnly = text.replace(chapterOnlyRegex, (match, book, chapter) => {
    const normalizedBook = String(book).toLowerCase().replace(/\./g, "");
    if (singleChapterBooks.has(normalizedBook)) {
      return match;
    }

    const ref = `${book} ${chapter}`;
    return `<span class="bible-ref" data-ref="${ref}">${match}</span>`;
  });

  const placeholders = [];
  const withSingleChapterMulti = withChapterOnly.replace(
    multiVerseSingleChapterRegex,
    (match, book, firstVerse) => {
      const firstRef = `${book} ${firstVerse}`;
      let output = `<span class="bible-ref" data-ref="${firstRef}">${book} ${firstVerse}</span>`;

      const rest = match.slice(`${book} ${firstVerse}`.length);
      const extraMatches = rest.match(/,\s*\d+(?:[-\u2013\u2014]\d+)?/g) ?? [];

      extraMatches.forEach((chunk) => {
        const verse = chunk.replace(/,\s*/, "");
        const ref = `${book} ${verse}`;
        output += `${chunk.replace(verse, "")}<span class="bible-ref" data-ref="${ref}">${verse}</span>`;
      });

      const token = `__BIBLE_MULTI__${placeholders.length}__`;
      placeholders.push(output);
      return token;
    }
  );

  const withMulti = withSingleChapterMulti.replace(
    multiVerseRegex,
    (match, book, chapter, firstVerse) => {
      const baseRef = `${book} ${chapter}`;
      const firstRef = `${baseRef}:${firstVerse}`;
      let output = `<span class="bible-ref" data-ref="${firstRef}">${book} ${chapter}:${firstVerse}</span>`;

      const rest = match.slice(`${book} ${chapter}:${firstVerse}`.length);
      const extraMatches = rest.match(
        /,\s*\d+(?::\d+(?:[-\u2013\u2014]\d+)?)?(?:[-\u2013\u2014]\d+)?/g
      ) ?? [];

      extraMatches.forEach((chunk) => {
        const verse = chunk.replace(/,\s*/, "");
        const ref = verse.includes(":") ? `${book} ${verse}` : `${baseRef}:${verse}`;
        output += `${chunk.replace(verse, "")}<span class="bible-ref" data-ref="${ref}">${verse}</span>`;
      });

      const token = `__BIBLE_MULTI__${placeholders.length}__`;
      placeholders.push(output);
      return token;
    }
  );

  const withSingleChapterSingles = withMulti.replace(
    singleVerseSingleChapterRegex,
    (match, book, verse) => {
      const ref = `${book} ${verse}`;
      return `<span class="bible-ref" data-ref="${ref}">${match}</span>`;
    }
  );

  const withSingles = withSingleChapterSingles.replace(
    singleVerseRegex,
    (match, book, chapter, verse) => {
      const ref = `${book} ${chapter}:${verse}`;
      return `<span class="bible-ref" data-ref="${ref}">${match}</span>`;
    }
  );

  const withContinuedVerses = withSingles.replace(
    /((?:<span class="bible-ref" data-ref="([^"]+)">[^<]+<\/span>)(?:[^<]|<(?!span class="bible-ref"))*)/g,
    (segment) => {
      let lastBook = null;

      const seedMatch = segment.match(/data-ref="([^"]+)"/);
      if (seedMatch) {
        const ref = seedMatch[1] ?? "";
        const bookMatch = ref.match(/^(.+?)\s+\d+:\d+/);
        lastBook = bookMatch?.[1] ?? null;
      }

      return segment.replace(continuedVerseRegex, (match, separator, chapterVerse) => {
        if (!lastBook) {
          return match;
        }

        const ref = `${lastBook} ${chapterVerse}`;
        return `${separator}<span class="bible-ref" data-ref="${ref}">${chapterVerse}</span>`;
      });
    }
  );

  return withContinuedVerses.replace(/__BIBLE_MULTI__(\d+)__/g, (match, index) => {
    const idx = Number(index);
    return Number.isNaN(idx) ? match : placeholders[idx] ?? match;
  });
}

export function autoLinkBibleRefs(html) {
  const parts = html.split(/(<[^>]+>)/g);
  const skippedTags = new Set(["astro-island", "script", "style"]);
  const stack = [];

  return parts
    .map((part) => {
      if (!part) {
        return part;
      }

      if (part.startsWith("<")) {
        const closing = part.match(/^<\/\s*([a-zA-Z0-9-]+)/);
        const opening = part.match(/^<\s*([a-zA-Z0-9-]+)/);

        if (closing) {
          const tag = closing[1].toLowerCase();
          const index = stack.lastIndexOf(tag);
          if (index !== -1) {
            stack.splice(index, 1);
          }
        } else if (opening && !part.endsWith("/>")) {
          const tag = opening[1].toLowerCase();
          if (skippedTags.has(tag)) {
            stack.push(tag);
          }
        }

        return part;
      }

      return stack.length ? part : linkBibleRefsText(part);
    })
    .join("");
}
