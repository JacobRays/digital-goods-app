import React, { useState } from 'react';

const BatchSelection = ({ product, onSelectBatch, onClose }) => {
  const [selectedBatch, setSelectedBatch] = useState(null);

  const handleBatchChange = (batch) => {
    if (selectedBatch?.id === batch.id) {
      // Clicking the same radio button deselects it
      setSelectedBatch(null);
    } else {
      // Clicking a different radio button selects it
      setSelectedBatch(batch);
    }
  };

  return (
    <div className="payment-modal">
      <div className="payment-content">
        <div className="payment-header">
          <button className="back-btn" onClick={onClose}>← Back</button>
          <h2 className="batch-selection-title">Select Lead Batch</h2>
        </div>
        
        <div className="product-info">
          <h3>{product.name}</h3>
          <p className="product-desc">{product.description}</p>
        </div>

        <div className="batches-list">
          <h4 className="batches-section-title">Available Batches:</h4>
          {product.batches && product.batches.map(batch => (
            <div 
              key={batch.id}
              className={`batch-item ${selectedBatch?.id === batch.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                id={batch.id}
                name="batchSelection"
                checked={selectedBatch?.id === batch.id}
                onChange={() => handleBatchChange(batch)}
                className="batch-radio"
              />
              <label htmlFor={batch.id} className="batch-label">
                <div className="batch-info">
                  <h5>{batch.name}</h5>
                  <p>{batch.description}</p>
                  <div className="batch-price">${batch.price}</div>
                </div>
                <div className="batch-select">
                  {selectedBatch?.id === batch.id ? '✅' : '⬜'}
                </div>
              </label>
            </div>
          ))}
        </div>

        <button 
          className="pay-now-btn"
          onClick={() => selectedBatch && onSelectBatch(selectedBatch)}
          disabled={!selectedBatch}
        >
          {selectedBatch ? `Continue to Payment - $${selectedBatch.price}` : 'Select a Batch'}
        </button>

        {selectedBatch && (
          <button 
            className="clear-selection-btn"
            onClick={() => setSelectedBatch(null)}
          >
            ✖ Clear Selection
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchSelection;