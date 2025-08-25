import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function ResourceList({ csvUrl }) {
  const [columns, setColumns] = useState({ left: [], right: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(csvUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((csvText) => {
        const { data, errors } = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        if (errors.length) {
          console.warn(errors);
          setError('CSV parse error');
          return;
        }

        // group by Category
        const grouped = data.reduce((map, item) => {
          const cat = item.Category?.trim() || 'Uncategorized';
          if (!map[cat]) map[cat] = [];
          map[cat].push(item);
          return map;
        }, {});

        // sort within each category
        Object.values(grouped).forEach((arr) =>
          arr.sort(
            (a, b) =>
              (Number(a['Sort Order']) || 0) -
              (Number(b['Sort Order']) || 0)
          )
        );

        // build an array of [category, links[]]
        const entries = Object.entries(grouped);

        // compute total number of links
        const totalLinks = entries.reduce(
          (sum, [, links]) => sum + links.length,
          0
        );
        const half = totalLinks / 2;

        // split by “weight” (links count)
        const left = [];
        const right = [];
        let acc = 0;
        for (let [cat, links] of entries) {
          if (acc < half) {
            left.push([cat, links]);
            acc += links.length;
          } else {
            right.push([cat, links]);
          }
        }

        setColumns({ left, right });
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [csvUrl]);

  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!columns.left.length && !columns.right.length)
    return <div>Loading resources…</div>;

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
