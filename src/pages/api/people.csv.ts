import type { APIRoute } from 'astro';

const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1ENFxo216pDegcvQ-WOfAJW_1VHAJ121-Sg_zTNTC61A/export?format=csv&gid=0';

export const GET: APIRoute = async () => {
  try {
    const upstream = await fetch(SHEET_CSV, { redirect: 'follow' });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return new Response(
        `Upstream error ${upstream.status}\n${text.slice(0, 200)}`,
        { status: 502 }
      );
    }
    const csv = await upstream.text();
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        // Cache for 1 hour, allow 5 min stale while revalidating
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
      },
    });
  } catch {
    return new Response('Proxy error fetching People CSV', { status: 502 });
  }
};
