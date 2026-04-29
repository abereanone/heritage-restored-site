import React, { useEffect, useMemo, useState } from 'react';

export default function PeopleList({ people: rows = [], filterNames, hideBio = false, className = '' }) {
  const [showall, setShowall] = useState(false);
  const [expanded, setExpanded] = useState({});
  const filterKey = Array.isArray(filterNames) ? JSON.stringify(filterNames) : '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const val = (params.get('showall') || '').trim().toLowerCase();
    setShowall(val === 'y' || val === 'yes' || val === 'true' || val === '1');
  }, []);

  const people = useMemo(() => {
    let cleaned = rows;

    if (!showall) {
      cleaned = cleaned.filter(
        row => (row.visible ?? '').toString().trim().toLowerCase() !== 'no'
      );
    }

    cleaned = cleaned
      .map(row => {
        const priority = parseInt((row.priority ?? '').toString().trim(), 10);
        return {
          ...row,
          name: (row.name ?? '').toString().trim(),
          role: (row.role ?? '').toString().trim(),
          bio: (row.bio ?? '').toString().trim(),
          link_url: (row.link_url ?? '').toString().trim(),
          link_label: (row.link_label ?? '').toString().trim(),
          photo_url: (row.photo_url ?? '').toString().trim(),
          _priority: Number.isFinite(priority) ? priority : Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a._priority - b._priority);

    if (filterKey) {
      const allowedNames = JSON.parse(filterKey);
      const allowed = new Set(
        allowedNames
          .map(name => (name ?? '').toString().trim())
          .filter(Boolean)
      );
      if (allowed.size) {
        cleaned = cleaned.filter(person => allowed.has(person.name));
      }
    }

    return cleaned;
  }, [rows, showall, filterKey]);

  const gridClass = ['people-grid', className].filter(Boolean).join(' ');

  return (
    <div className={gridClass}>
      {people.map((person, idx) => {
        const key = person.name || `person-${idx}`;
        const isExpanded = !!expanded[key];
        const shouldTruncate = person.bio && person.bio.length > 350;
        const displayBio = !isExpanded && shouldTruncate
          ? `${person.bio.substring(0, 100)} ... `
          : person.bio;
        const showBio = Boolean(person.bio) && !hideBio;

        return (
          <div className="person-card" key={key}>
            <div className="person-photo">
              <img
                src={`/${person.photo_url || 'placeholder.png'}`}
                alt={person.name || 'Person'}
              />
            </div>
            {person.name && <h2>{person.name}</h2>}
            {person.role && (
              <p>
                <strong>{person.role}</strong>
              </p>
            )}

            {showBio && (
              <p className="person-bio">
                {displayBio}
                {shouldTruncate && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(prev => ({ ...prev, [key]: !isExpanded }))
                    }
                    aria-expanded={isExpanded}
                    className="inline-link-button"
                  >
                    {isExpanded ? ' Show less' : ' Read more'}
                  </button>
                )}
              </p>
            )}

            {person.link_url && (
              <p>
                <a href={person.link_url} target="_blank" rel="noopener noreferrer">
                  {person.link_label || 'Learn more'}
                </a>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
