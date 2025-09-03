import type { APIRoute } from 'astro';

// const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1ENFxo216pDegcvQ-WOfAJW_1VHAJ121-Sg_zTNTC61A/export?format=csv&gid=0';
const SHEET_ID = '1ENFxo216pDegcvQ-WOfAJW_1VHAJ121-Sg_zTNTC61A';
const SHEET_NAME = 'People'; // <-- the visible tab name in the UI

// GViz CSV is usually fresher than "Publish to web" CSV
const SHEET_CSV =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

export const GET: APIRoute = async () => {
  try {
    const bust = `_=${Date.now()}`;
    const url = SHEET_CSV + (SHEET_CSV.includes('?') ? '&' : '?') + bust;
    const upstream = await fetch(url, { redirect: 'follow', cache: 'no-store' });
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

        // Strong no-cache set covering browsers + most CDNs
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',          // legacy/proxies
        'Expires': '0',                // legacy

        // CDN-specific knobs many edges honor
        'Surrogate-Control': 'no-store',     // Fastly/Netlify
        'CDN-Cache-Control': 'no-store',     // some CDNs
        'X-Debug-Build': new Date().toISOString(),
        'X-Debug-Upstream-Url': url,               // the exact GViz URL (with &_=…)
        'X-Debug-First-80': csv.slice(0, 80).replace(/\n/g, '\\n'),      },
    });
  } catch {
    return new Response('Proxy error fetching People CSV', { status: 502 });
  }
};
