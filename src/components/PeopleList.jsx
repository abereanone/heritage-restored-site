import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function PeopleList({ csvUrl }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

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
              .filter(row => row.visible?.toLowerCase() !== 'no')
              .sort((a, b) => parseInt(a.priority) - parseInt(b.priority));
            setPeople(filtered);
            setLoading(false);
          },
        });
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [csvUrl]);

  if (loading) {
    return <div>Loading people now... be patient</div>;
  }

  return (
    <div className="people-grid">
      {people.map(person => {
        const isExpanded = !!expanded[person.name];
        const shouldTruncate = person.bio && person.bio.length > 100;
        const displayBio = !isExpanded && shouldTruncate
          ? `${person.bio.substring(0, 100)} ... `
          : person.bio;

        return (
          <div className="person-card" key={person.name}>
            <div className="person-photo">
              <img src={`/${person.photo_url}`} alt={person.name} />
            </div>
            <h2>{person.name}</h2>
            <p><strong>{person.role}</strong></p>
            {person.bio && (
              <p>
                {displayBio}
                {shouldTruncate && (
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      setExpanded(prev => ({
                        ...prev,
                        [person.name]: !isExpanded,
                      }));
                    }}
                  >
                    {isExpanded ? ' Show less' : ' Read more'}
                  </a>
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
