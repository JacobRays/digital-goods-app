// src/Payment.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './Payment.css';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const PAYPAL_ME = 'premiumrays'; // your username

const Payment = ({ product, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState('paypal');
  const [selectedCrypto, setSelectedCrypto] = useState('btc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [settings, setSettings] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false); // New state for copy feedback

  // stable user id
  const userId = useMemo(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem('userId', id);
    }
    return id;
  }, []);

  // socket.io
  useEffect(() => {
    const socket = io(API_BASE, { transports: ['websocket'] });
    socket.emit('join', { userId });
    socket.on('purchase-updated', (payload) => {
      if (purchase && payload.id === purchase.id) setPurchase(payload);
    });
    return () => socket.disconnect();
  }, [userId, purchase]);

  // load settings (wallets) + refresh latest purchase every 5s
  useEffect(() => {
    (async () => {
      try {
        const s = await fetch(`${API_BASE}/api/settings`).then((r) => r.json());
        setSettings(s);
      } catch (e) { console.error(e); }
    })();
    const tick = async () => {
      try {
        const list = await fetch(`${API_BASE}/api/purchases?userId=${userId}`).then((r) => r.json());
        if (Array.isArray(list) && list.length > 0) setPurchase(list[list.length - 1]);
      } catch (e) { /* ignore */ }
    };
    tick();
    const iv = setInterval(tick, 5000);
    return () => clearInterval(iv);
  }, [userId]);

  const wallets = useMemo(() => ({
    btc: settings?.wallets?.btc || '',
    eth: settings?.wallets?.eth || '',
    usdt: settings?.wallets?.usdt_trc20 || ''
  }), [settings]);

  const cryptoAddress = wallets[selectedCrypto];

  // Copy address function with feedback
  const copyAddress = async () => {
    if (!cryptoAddress) return;
    
    try {
      await navigator.clipboard.writeText(cryptoAddress);
      setCopied(true);
      // Reset the "Copied!" message after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = cryptoAddress;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        alert('Failed to copy address. Please copy it manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handlePayPal = async () => {
    setIsProcessing(true);
    window.open(`https://paypal.me/${PAYPAL_ME}/${product?.price}`, '_blank');

    // Create completed purchase (instant access for PayPal.me flow)
    try {
      const resp = await fetch(`${API_BASE}/api/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productName: product.name,
          amount: product.price,
          currency: 'USD',
          status: 'completed',
          files: product.files || [],
          paymentMethod: 'paypal'
        })
      });
      const p = await resp.json();
      setPurchase(p);
    } catch (e) {
      console.error(e);
      alert('Could not record PayPal purchase.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCrypto = async () => {
    if (!cryptoAddress) {
      alert('Crypto wallet is not configured by admin.');
      return;
    }
    if (!window.confirm(`Send $${product.price} in ${selectedCrypto.toUpperCase()} to:\n${cryptoAddress}`)) {
      return;
    }
    setIsProcessing(true);
    try {
      const resp = await fetch(`${API_BASE}/api/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productName: product.name,
          amount: product.price,
          currency: selectedCrypto.toUpperCase(),
          status: 'pending',
          files: product.files || [],
          paymentMethod: 'crypto',
          cryptoCurrency: selectedCrypto.toUpperCase(),
          cryptoAddress
        })
      });
      const p = await resp.json();
      setPurchase(p);
      alert('Payment recorded. Your files will be released once verified.');
    } catch (e) {
      console.error(e);
      alert('Could not record crypto payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitTxHash = async () => {
    if (!purchase) return;
    try {
      const resp = await fetch(`${API_BASE}/api/purchases/${purchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txHash.trim() })
      });
      const updated = await resp.json();
      setPurchase(updated);
      alert('Transaction hash submitted. Admin will verify soon.');
    } catch (e) {
      console.error(e);
      alert('Could not submit tx hash.');
    }
  };

  return (
    <div className="payment-modal">
      <div className="payment-container">

        {/* Header */}
        <div className="payment-header">
          <button className="back-btn" onClick={onClose}>← Back</button>
          <h2>{settings?.appTitle || 'Complete Purchase'}</h2>
        </div>

        {/* Product Info */}
        <div className="product-section">
          <div className="product-title">
            <div className="emoji">{product.thumbnail || '📦'}</div>
            <div>
              <h3>{product.name}</h3>
              <p className="subtitle">{settings?.appSubtitle || 'Instant digital goods'}</p>
            </div>
          </div>
          <p className="product-price">${product.price}</p>
        </div>

        {/* Method Tabs */}
        <div className="method-tabs">
          <button
            className={selectedMethod === 'paypal' ? 'active' : ''}
            onClick={() => setSelectedMethod('paypal')}
          >
            PayPal
          </button>
          <button
            className={selectedMethod === 'crypto' ? 'active' : ''}
            onClick={() => setSelectedMethod('crypto')}
          >
            Crypto
          </button>
        </div>

        {/* Method Details */}
        <div className="method-details">
          {selectedMethod === 'paypal' && (
            <div className="paypal-info">
              <p>You'll be redirected to PayPal.me to complete your payment.</p>
              <button className="confirm-btn" onClick={handlePayPal} disabled={isProcessing}>
                {isProcessing ? 'Redirecting...' : 'Pay with PayPal'}
              </button>
            </div>
          )}

          {selectedMethod === 'crypto' && (
            <div className="crypto-info">
              <label>Select Crypto:</label>
              <select value={selectedCrypto} onChange={(e) => setSelectedCrypto(e.target.value)}>
                <option value="btc">BTC</option>
                <option value="eth">ETH</option>
                <option value="usdt">USDT (TRC20)</option>
              </select>

              <div className="wallet-block">
                <p className="wallet-label">Wallet Address:</p>
                <div className="wallet-row">
                  <span className="wallet">{cryptoAddress || 'Not set'}</span>
                  {cryptoAddress && (
                    <button
                      className={`copy-btn ${copied ? 'copied' : ''}`}
                      onClick={copyAddress}
                    >
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                {cryptoAddress && (
                  <div className="qr-wrap">
                    <QRCodeSVG value={cryptoAddress} size={140} />
                  </div>
                )}
              </div>

              <button className="confirm-btn" onClick={handleCrypto} disabled={isProcessing}>
                {isProcessing ? 'Recording...' : `I have sent ${selectedCrypto.toUpperCase()}`}
              </button>

              {purchase?.paymentMethod === 'crypto' && (
                <div className="tx-section">
                  <label>Transaction Hash (optional but recommended):</label>
                  <input
                    type="text"
                    placeholder="Paste your tx hash…"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                  />
                  <button className="outline-btn" onClick={submitTxHash}>Submit Hash</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Receipt */}
        {purchase && (
          <div className="payment-receipt">
            <h3>Payment Receipt</h3>
            <p><strong>Product:</strong> {purchase.productName}</p>
            <p><strong>Amount:</strong> {purchase.amount} {purchase.currency}</p>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`status ${purchase.status}`}>{purchase.status}</span>
            </p>

            {purchase.txHash && (
              <p><strong>Tx:</strong> <span className="mono">{purchase.txHash}</span></p>
            )}

            {purchase.status === 'pending' && (
              <p className="pending-msg">⏳ Your payment is pending. Please wait for admin approval.</p>
            )}

            {purchase.status === 'completed' && (
              <div className="download-files">
                <h4>Download Files</h4>
                {purchase.files?.map((file, idx) => (
                  <a key={idx} href={`${API_BASE}${file.url}`} download={file.name} className="download-btn">
                    Download {file.name}
                  </a>
                ))}
                <div className="receipt-actions">
                  <button
                    className="back-to-store-btn"
                    onClick={() => window.location.href = '/'}
                  >
                    ← Back to Store
                  </button>
                </div>
              </div>
            )}

            {purchase.status === 'rejected' && (
              <p className="rejected-msg">❌ Your payment was rejected. Please contact support.</p>
            )}
          </div>
        )}

        <button className="cancel-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Payment;
