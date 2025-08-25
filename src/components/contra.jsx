import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

/**
 * Contra component: displays contraceptive methods with category and mechanism notes.
 * Expects columns: Method, Category, Notes/Mechanism, visible, sortOrder
 */
export default function Contra({ csvUrl }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(csvUrl)
      .then((res) => res.text())
      .then((csvText) => {
        if (cancelled) return;
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: ({ data }) => {
            // 1) Filter by visibility
            // 2) Normalize/trim fields
            // 3) Parse sortOrder to number (fallback to large number when missing)
            const cleaned = data
              .filter((row) => (row.visible ?? row.Visible ?? '').toString().trim().toLowerCase() !== 'no')
              .map((row) => {
                const sortOrderRaw = row.sortOrder ?? row.SortOrder ?? row.sortorder;
                const sortOrder = Number.parseInt((sortOrderRaw ?? '').toString().trim(), 10);
                return {
                  ...row,
                  Method: (row.Method ?? '').toString().trim(),
                  Category: (row.Category ?? '').toString().trim(),
                  NotesMechanism: (row['Notes/Mechanism'] ?? row['NotesMechanism'] ?? '').toString().trim(),
                  sortOrder: Number.isFinite(sortOrder) ? sortOrder : Number.MAX_SAFE_INTEGER,
                };
              });

            // Multi-level sort:
            //  - Category: DESCENDING (Z → A)
            //  - sortOrder: ASCENDING (1 → 999)
            //  - Method: ASC as a stable tiebreaker
            cleaned.sort((a, b) => {
              const aCat = a.Category.toLowerCase();
              const bCat = b.Category.toLowerCase();
              if (aCat < bCat) return 1; // desc
              if (aCat > bCat) return -1; // desc
              if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder; // asc
              return a.Method.localeCompare(b.Method); // tiebreaker
            });

            setItems(cleaned);
            setLoading(false);
          },
          error: (err) => {
            console.error('Error parsing CSV:', err);
            setLoading(false);
          },
        });
      })
      .catch((err) => {
        console.error('Error loading CSV:', err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [csvUrl]);

  if (loading) {
    return <div>Loading data... please wait</div>;
  }

  return (
    <div className="contra-grid">
      {items.map((item, idx) => {
        const catKey = (item.Category || '').toLowerCase();
        return (
          <div className={`contra-card ${catKey}`} key={idx}>
            <h2>{item.Method}</h2>
            <h2>{item.Category}</h2>
            {item.NotesMechanism && (
              <p>
                <strong>Mechanism:</strong> {item.NotesMechanism}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
