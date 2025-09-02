import type { APIRoute } from 'astro';

// const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/15FtcWRJnF-0-7zWLzbk7NIzcMsbR90zGrLh3v2xMvrU/export?format=csv&gid=0';
const SHEET_ID = '15FtcWRJnF-0-7zWLzbk7NIzcMsbR90zGrLh3v2xMvrU';
const SHEET_NAME = 'Links'; // <-- the visible tab name in the UI

// GViz CSV is usually fresher than "Publish to web" CSV
const SHEET_CSV =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

export const GET: APIRoute = async () => {
  try {
    const upstream = await fetch(SHEET_CSV, { redirect: 'follow' });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return new Response(`Upstream ${upstream.status}\n${text.slice(0, 200)}`, { status: 502 });
    }
    const csv = await upstream.text();
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        // Cache for 1 hour; serve stale up to 5 min while refreshing
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
      },
    });
  } catch {
    return new Response('Proxy error fetching Resources CSV', { status: 502 });
  }
};
