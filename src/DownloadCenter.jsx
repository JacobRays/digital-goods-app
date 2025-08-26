import React, { useState, useEffect } from 'react';

const DownloadCenter = ({ onBack }) => {
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    // Get user ID from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/purchases/${userId}`);
      const data = await response.json();
      setPurchases(data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const handleDownload = (file) => {
    // Simulate file download
    alert(`Downloading ${file.name}`);
    // In a real app, you would generate a download link
    // window.open(file.url, '_blank');
  };

  return (
    <div className="download-center">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>📥 My Downloads</h2>
      </div>

      <div className="downloads-list">
        {purchases.length === 0 ? (
          <div className="empty-downloads">
            <p>No downloads available yet.</p>
            <p>Your purchased files will appear here after payment approval.</p>
          </div>
        ) : (
          purchases.map(purchase => (
            <div key={purchase.id} className="download-item">
              <h3>{purchase.product.name}</h3>
              <p>Purchased on: {new Date(purchase.date).toLocaleDateString()}</p>
              <p>Status: <span className={`status ${purchase.status}`}>{purchase.status}</span></p>
              
              <div className="download-files">
                <h4>Files:</h4>
                {purchase.files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-icon">
                      {file.type === 'pdf' ? '📄' : 
                       file.type === 'csv' ? '📊' : 
                       file.type === 'zip' ? '📦' : '📁'}
                    </span>
                    <span className="file-name">{file.name}</span>
                    <button 
                      className="download-btn"
                      onClick={() => handleDownload(file)}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DownloadCenter;