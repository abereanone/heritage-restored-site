import React from 'react';

function getColumns(data) {
  const grouped = data.reduce((map, item) => {
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
}

export default function ResourceList({ resources = [] }) {
  const columns = getColumns(resources);

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
