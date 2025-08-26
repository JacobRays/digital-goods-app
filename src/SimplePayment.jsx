import React, { useState } from 'react';

const SimplePayment = ({ product, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = (method) => {
    setIsProcessing(true);
    
    if (method === 'paypal') {
      window.open(`https://paypal.me/premiumrays/${product.price}USD`, '_blank');
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(true); // true for instant access
      }, 2000);
    } else {
      // Crypto payment
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(false); // false for pending
      }, 1000);
    }
  };

  return (
    <div className="payment-modal">
      <div className="payment-content">
        <div className="payment-header">
          <button className="back-btn" onClick={onClose}>← Back</button>
          <h2>Purchase: {product.name}</h2>
          <p className="price">${product.price}</p>
        </div>

        <div className="simple-payment-options">
          <button 
            className="payment-option paypal"
            onClick={() => handlePayment('paypal')}
            disabled={isProcessing}
          >
            <span className="payment-icon">📱</span>
            <span className="payment-text">Pay with PayPal</span>
            <span className="payment-subtext">Instant access</span>
          </button>

          <button 
            className="payment-option crypto"
            onClick={() => handlePayment('crypto')}
            disabled={isProcessing}
          >
            <span className="payment-icon">₿</span>
            <span className="payment-text">Pay with Crypto</span>
            <span className="payment-subtext">24h verification</span>
          </button>
        </div>

        {isProcessing && (
          <div className="processing-overlay">
            <div className="processing-spinner">⏳</div>
            <p>Processing payment...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplePayment;