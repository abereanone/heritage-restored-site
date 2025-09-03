import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

function useFreshCsv(csvUrl, transform) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(csvText => {
        if (cancelled) return;
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: ({ data }) => {
            setData(transform(data));
            setLoading(false);
          },
          error: () => setLoading(false),
        });
      })
      .catch(() => setLoading(false));

    return () => { cancelled = true };
  }, [csvUrl, transform]);

  return { data, loading };
}

export default function Contra({ csvUrl }) {
  const { data: items, loading } = useFreshCsv(csvUrl, (rows) => {
    const cleaned = rows
      .filter(r => (r.visible ?? r.Visible ?? '').toString().trim().toLowerCase() !== 'no')
      .map(r => {
        const raw = r.sortOrder ?? r.SortOrder ?? r.sortorder;
        const n = Number.parseInt((raw ?? '').toString().trim(), 10);
        return {
          ...r,
          Method: (r.Method ?? '').toString().trim(),
          Category: (r.Category ?? '').toString().trim(),
          NotesMechanism: (r['Notes/Mechanism'] ?? r['NotesMechanism'] ?? '').toString().trim(),
          sortOrder: Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER,
        };
      });

    cleaned.sort((a, b) => {
      const aCat = a.Category.toLowerCase();
      const bCat = b.Category.toLowerCase();
      if (aCat < bCat) return 1;
      if (aCat > bCat) return -1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.Method.localeCompare(b.Method);
    });
    return cleaned;
  });

  if (loading) return <div>Loading data... please wait</div>;

  return (
    <div className="contra-grid">
      {items.map((item, idx) => {
        const catKey = (item.Category || '').toLowerCase();
        return (
          <div className={`contra-card ${catKey}`} key={idx}>
            <h2>{item.Method}</h2>
            <h2>{item.Category}</h2>
            {item.NotesMechanism && (
              <p><strong>Mechanism:</strong> {item.NotesMechanism}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
