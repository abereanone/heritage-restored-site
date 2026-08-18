/**
 * Post-build assertions against dist/.
 *
 * Each check exists because the corresponding bug actually shipped:
 *
 *  - verse links: "HB 370" (an Ohio bill) linked as Habakkuk 370 and rendered a
 *    dead tooltip, because bookMap maps "hb" to Habakkuk.
 *  - hidden people: someone marked visible=no rendered anyway, because
 *    .person-card { display: flex } outranks the UA [hidden] rule.
 *  - assets: moving files between public/ and src/ silently 404s references.
 *
 * Run with: npm run check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");

const failures = [];
const notes = [];

function fail(check, detail) {
  failures.push(`${check}: ${detail}`);
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const allFiles = walk(distDir);
const htmlFiles = allFiles.filter((f) => f.endsWith(".html"));
const rel = (f) =>
  f
    .slice(distDir.length + 1)
    .split(path.sep)
    .join("/");

// ---------------------------------------------------------------------------
// 1. Every rendered verse reference must resolve to real verse text.
// ---------------------------------------------------------------------------
const bookMap = readJson("src/components/bookMap.json");
const chapterCounts = readJson("src/components/chapterCounts.json");
const verses = readJson("src/generated/bible-cited.json").verses ?? {};

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

// Mirrors src/utils/normalizeRef.js
function normalizeReference(reference) {
  const lower = String(reference ?? "")
    .trim()
    .toLowerCase()
    .replace(/–|—/g, "-");
  const parts = lower.split(/\s+/);
  if (parts.length < 2) return reference;

  const book = parts.slice(0, -1).join(" ");
  let chapterAndVerse = parts[parts.length - 1];
  if (/^\d+$/.test(chapterAndVerse) && singleChapterBooks.has(book)) {
    chapterAndVerse = `1:${chapterAndVerse}`;
  }

  const cleaned = book.replace(/\./g, "");
  const normalizedBook = bookMap[book] ?? bookMap[cleaned] ?? null;
  if (!normalizedBook) return reference;

  if (/^\d+$/.test(chapterAndVerse) && singleChapterBooks.has(normalizedBook)) {
    chapterAndVerse = `1:${chapterAndVerse}`;
  }
  return `${normalizedBook} ${chapterAndVerse}`;
}

// Mirrors normalizeLookupKey in src/utils/bibleClient.js
function lookupKey(reference) {
  return String(reference ?? "")
    .trim()
    .replace(/\|.*$/g, "")
    .replace(/(\d+)\s+and\s+(\d+)/gi, "$1, $2")
    .toLowerCase()
    .replace(/–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

let refCount = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/data-ref="([^"]+)"/g)) {
    refCount++;
    const raw = match[1];
    const key = lookupKey(normalizeReference(raw));
    if (!verses[key]) {
      fail("verse-links", `${rel(file)} links "${raw}" -> "${key}", which has no verse text`);
    }
  }
}
notes.push(
  `verse-links: ${refCount} references checked against ${Object.keys(verses).length} verses`,
);

// Guard the specific collision class that caused the HB 370 bug.
for (const [code, max] of Object.entries(chapterCounts)) {
  if (!Number.isInteger(max) || max < 1) {
    fail("chapter-counts", `${code} has an invalid chapter count: ${max}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Nobody marked visible=no may appear in the output.
// ---------------------------------------------------------------------------
const people = readJson("src/data/people.json");
const hiddenPeople = people
  .filter((p) => (p.visible ?? "").toString().trim().toLowerCase() === "no")
  .map((p) => (p.name ?? "").toString().trim())
  .filter(Boolean);

for (const name of hiddenPeople) {
  for (const file of allFiles) {
    const contents = fs.readFileSync(file);
    if (contents.includes(name)) {
      fail("hidden-people", `"${name}" is marked visible=no but appears in ${rel(file)}`);
    }
  }
}
notes.push(
  hiddenPeople.length
    ? `hidden-people: ${hiddenPeople.length} hidden (${hiddenPeople.join(", ")}) confirmed absent`
    : "hidden-people: none marked visible=no",
);

// ---------------------------------------------------------------------------
// 3. Every referenced local asset must exist.
// ---------------------------------------------------------------------------
let assetCount = 0;
const assetPattern =
  /(?:src|href)="(\/[^"]+\.(?:png|jpe?g|webp|avif|gif|svg|ico|pdf|css|js|json|webmanifest|xml|txt|csv))"/g;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(assetPattern)) {
    assetCount++;
    if (!fs.existsSync(path.join(distDir, match[1]))) {
      fail("assets", `${rel(file)} references ${match[1]}, which does not exist`);
    }
  }
}
notes.push(`assets: ${assetCount} local references resolved`);

// Manifest icons are referenced from JSON, not HTML, so check them separately.
const manifestPath = path.join(distDir, "site.webmanifest");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const icon of manifest.icons ?? []) {
    if (!fs.existsSync(path.join(distDir, icon.src))) {
      fail("assets", `site.webmanifest references ${icon.src}, which does not exist`);
    }
  }
  notes.push(`assets: ${(manifest.icons ?? []).length} manifest icons resolved`);
}

// ---------------------------------------------------------------------------
// 4. Baseline SEO tags every page needs.
// ---------------------------------------------------------------------------
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (!/<html[^>]+lang=/.test(html)) fail("seo", `${rel(file)} has no lang attribute`);
  if (!/<title>[^<]+<\/title>/.test(html))
    fail("seo", `${rel(file)} has an empty or missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    fail("seo", `${rel(file)} has no meta description`);
  }
  if (!/<link rel="canonical"/.test(html)) fail("seo", `${rel(file)} has no canonical link`);
}
notes.push(`seo: ${htmlFiles.length} pages checked for lang, title, description, canonical`);

// ---------------------------------------------------------------------------
// 5. Debug endpoints must not ship.
// ---------------------------------------------------------------------------
if (fs.existsSync(path.join(distDir, "api"))) {
  fail("debug-routes", "dist/api/ exists; debug endpoints should not be deployed");
}

// ---------------------------------------------------------------------------

for (const note of notes) console.log(`  ok  ${note}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const failure of failures) console.error(`  FAIL  ${failure}`);
  process.exit(1);
}

console.log("\nAll output checks passed.");
