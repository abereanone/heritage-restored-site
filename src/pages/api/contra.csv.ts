import type { APIRoute } from 'astro';

const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1xvQHkI4uFZaw8xXfTRCO59SQHlLecEPyHHMEjCOg2vg/export?format=csv&gid=0';

export const GET: APIRoute = async () => {
  try {
    const upstream = await fetch(SHEET_CSV, {
      redirect: 'follow',
      // Slightly longer timeout if your host supports it:
      // @ts-ignore - some adapters ignore this
      signal: AbortSignal.timeout?.(15000),
      headers: {
        // Some hosts/proxies behave better with an explicit UA:
        'User-Agent': 'heritagerestored.org csv fetch',
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('[contra.csv] Upstream error', upstream.status, text?.slice(0, 200));
      return new Response(
        `Upstream error from Google: ${upstream.status}.\n` +
        `First 200 bytes: ${text.slice(0, 200)}`,
        { status: 502 }
      );
    }

    const csv = await upstream.text();
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[contra.csv] Network/handler error:', err?.message || err);
    return new Response('Proxy error fetching CSV.', { status: 502 });
  }
};
