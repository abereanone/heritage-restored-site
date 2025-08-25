import type { APIRoute } from 'astro';

const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/15FtcWRJnF-0-7zWLzbk7NIzcMsbR90zGrLh3v2xMvrU/export?format=csv&gid=0';
//   'https://docs.google.com/spreadsheets/d/1MvQZvqtHsKNeBpKRtvDNknhDqLOwHfcT0oCgfkVOnGs/export?format=csv&gid=0';
// If needed later, a drop-in fallback that also returns CSV:
// 'https://docs.google.com/spreadsheets/d/1MvQZvqtHsKNeBpKRtvDNknhDqLOwHfcT0oCgfkVOnGs/gviz/tq?tqx=out:csv&gid=0';

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
