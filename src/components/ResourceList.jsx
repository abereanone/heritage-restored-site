import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

function useFreshCsv(csvUrl, transform) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          error: () => {
            setError('CSV parse error');
            setLoading(false);
          },
        });
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true };
  }, [csvUrl, transform]);

  return { data, loading, error };
}

export default function ResourceList({ csvUrl }) {
  const { data: columns, loading, error } = useFreshCsv(csvUrl, (rows) => {
    const grouped = rows.reduce((map, item) => {
      const cat = item.Category?.trim() || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
      return map;
    }, {});

    Object.values(grouped).forEach(arr =>
      arr.sort((a, b) => (Number(a['Sort Order']) || 0) - (Number(b['Sort Order']) || 0))
    );

    const entries = Object.entries(grouped);
    const totalLinks = entries.reduce((sum, [, links]) => sum + links.length, 0);
    const half = totalLinks / 2;

    const left = [], right = [];
    let acc = 0;
    for (let [cat, links] of entries) {
      if (acc < half) { left.push([cat, links]); acc += links.length }
      else { right.push([cat, links]) }
    }
    return { left, right };
  });

  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (loading) return <div>Loading resources…</div>;

  return (
    <div className="columns">
      <div className="column">
        {columns.left.map(([category, links]) => (
          <div className="category" key={category}>
            <h2>{category}</h2>
            <ul>
              {links.map((link, i) => (
                <li key={i}>
                  <a href={link.URL} target="_blank" rel="noopener">
                    {link['Display Name']}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="column">
        {columns.right.map(([category, links]) => (
          <div className="category" key={category}>
            <h2>{category}</h2>
            <ul>
              {links.map((link, i) => (
                <li key={i}>
                  <a href={link.URL} target="_blank" rel="noopener">
                    {link['Display Name']}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
