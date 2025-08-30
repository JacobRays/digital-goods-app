// src/DownloadCenter.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './DownloadCenter.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const DownloadCenter = ({ purchases = [], onBack }) => {
  const [approved, setApproved] = useState(purchases);

  const userId = useMemo(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem('userId', id);
    }
    return id;
  }, []);

  useEffect(() => {
    if (purchases.length === 0) {
      (async () => {
        const list = await fetch(
          `${API_BASE}/api/purchases?userId=${userId}&status=completed`
        ).then(r => r.json());
        setApproved(list.reverse());
      })();
    }
  }, [userId, purchases]);

  return (
    <div className="download-center">
      {/* Back button */}
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      )}

      <h2>Your Downloads</h2>
      {approved.length === 0 && (
        <p className="no-downloads">No approved purchases yet.</p>
      )}
      {approved.map((p) => (
        <div key={p.id} className="download-card">
          <h3>{p.productName}</h3>
          <p>
            Status: <span className="status approved">Approved</span>
          </p>
          <div className="download-files">
            {p.files?.map((file, i) => (
              <a
                key={i}
                href={`${API_BASE}${file.url}`}
                download={file.name}
                className="download-btn"
              >
                Download {file.name}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DownloadCenter;
