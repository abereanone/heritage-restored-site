import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

/**
 * Contra component: displays contraceptive methods with category and mechanism notes.
 * Expects columns: Method, Category, Notes/Mechanism, visible
 */
export default function Contra({ csvUrl }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(csvUrl)
      .then(res => res.text())
      .then(csvText => {
        if (cancelled) return;
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: ({ data }) => {
            const filtered = data
              .filter(row => row.visible?.toLowerCase() !== 'no');
            setItems(filtered);
            setLoading(false);
          },
          error: (err) => {
            console.error('Error parsing CSV:', err);
            setLoading(false);
          }
        });
      })
      .catch(err => {
        console.error('Error loading CSV:', err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [csvUrl]);

  if (loading) {
    return <div>Loading data... please wait</div>;
  }

  return (
    <div className="contra-grid">
      {items.map((item, idx) => {
        // Determine background class based on Category
        const catKey = item.Category?.toLowerCase() === 'contraceptive' ? 'contraceptive' : 'abort';
        return (
          <div className={`contra-card ${catKey}`} key={idx}>
            <h2>{item.Method}</h2>
            <h2>{item.Category}</h2>
            {item['Notes/Mechanism'] && (
              <p><strong>Mechanism:</strong> {item['Notes/Mechanism']}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
