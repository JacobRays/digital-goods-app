// SIMPLIFIED Payment.jsx - Remove Stars confusion
const Payment = ({ product, onClose, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('paypal'); // Default to PayPal
  const [selectedCrypto, setSelectedCrypto] = useState('btc');
  const [isProcessing, setIsProcessing] = useState(false);

  const PAYPAL_ME_LINK = 'https://paypal.me/premiumrays';

  const cryptoAddresses = {
    btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    eth: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 
    usdt: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7'
  };

  // Remove ALL Stars-related code
  const handlePayment = async () => {
    if (selectedMethod === 'paypal') {
      const paypalUrl = `${PAYPAL_ME_LINK}/${product.price}USD?locale.x=en_US`;
      window.open(paypalUrl, '_blank');
      
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(true); // Instant access
      }, 1000);
    }
  };

  // Keep your perfect crypto system
  const handleCryptoPaymentComplete = async () => {
    if (window.confirm(`Please send $${product.price} in ${selectedCrypto.toUpperCase()} and confirm.`)) {
      setIsProcessing(true);
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
      }
      try {
        const response = await fetch('http://localhost:3001/api/crypto-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            product,
            amount: product.price,
            cryptoCurrency: selectedCrypto,
            cryptoAddress: cryptoAddresses[selectedCrypto],
          }),
        });
        if (response.ok) {
          alert('Payment recorded! You\'ll get files after verification.');
          onSuccess(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="payment-modal">
      <div className="payment-content">
        <div className="payment-header">
          <button className="back-btn" onClick={onClose}>← Back</button>
          <h2>Complete Purchase</h2>
        </div>
        
        <div className="product-info">
          <h3>{product.name}</h3>
          <p className="price">${product.price}</p>
        </div>

        <div className="payment-methods">
          <h4>Select Payment Method</h4>

          {/* PayPal Option */}
          <div className="method-option">
            <input
              type="radio"
              id="paypal"
              name="paymentMethod"
              value="paypal"
              checked={selectedMethod === 'paypal'}
              onChange={() => setSelectedMethod('paypal')}
            />
            <label htmlFor="paypal">
              <span className="method-icon">📱</span>
              PayPal.me (Instant Delivery)
            </label>
          </div>

          {/* Crypto Option */}
          <div className="method-option">
            <input
              type="radio"
              id="crypto"
              name="paymentMethod"
              value="crypto"
              checked={selectedMethod === 'crypto'}
              onChange={() => setSelectedMethod('crypto')}
            />
            <label htmlFor="crypto">
              <span className="method-icon">₿</span>
              Cryptocurrency (24hr Verification)
            </label>
          </div>

          {/* Crypto Details */}
          {selectedMethod === 'crypto' && (
            <div className="crypto-selection">
              <h5>Select Cryptocurrency:</h5>
              <div className="crypto-options">
                <div className="crypto-option">
                  <input
                    type="radio"
                    id="btc"
                    name="cryptoType"
                    value="btc"
                    checked={selectedCrypto === 'btc'}
                    onChange={() => setSelectedCrypto('btc')}
                  />
                  <label htmlFor="btc">Bitcoin (BTC)</label>
                </div>
                <div className="crypto-option">
                  <input
                    type="radio"
                    id="eth"
                    name="cryptoType"
                    value="eth"
                    checked={selectedCrypto === 'eth'}
                    onChange={() => setSelectedCrypto('eth')}
                  />
                  <label htmlFor="eth">Ethereum (ETH)</label>
                </div>
                <div className="crypto-option">
                  <input
                    type="radio"
                    id="usdt"
                    name="cryptoType"
                    value="usdt"
                    checked={selectedCrypto === 'usdt'}
                    onChange={() => setSelectedCrypto('usdt')}
                  />
                  <label htmlFor="usdt">USDT (TRC20)</label>
                </div>
              </div>

              <div className="crypto-info">
                <p>Send exactly <strong>${product.price} USD</strong> equivalent in {selectedCrypto.toUpperCase()}:</p>
                <div className="crypto-address-box">
                  <p className="crypto-address-label">{selectedCrypto.toUpperCase()} Address:</p>
                  <div className="address-container">
                    <code className="crypto-address">{cryptoAddresses[selectedCrypto]}</code>
                    <button 
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(cryptoAddresses[selectedCrypto]);
                        alert('Address copied to clipboard!');
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                <p className="note">* Send exact amount, transaction fees are your responsibility</p>
                <p className="note">* Confirmations may take 10-30 minutes</p>
                <p className="note">* Files available after verification (within 24 hours)</p>
                
                <button 
                  className="crypto-confirm-btn"
                  onClick={handleCryptoPaymentComplete}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : `I've Sent the ${selectedCrypto.toUpperCase()}`}
                </button>
              </div>
            </div>
          )}

          {selectedMethod === 'paypal' && (
            <div className="paypal-info">
              <p>You will be redirected to PayPal to complete your payment</p>
              <p className="note">* Instant access to files after payment</p>
            </div>
          )}
        </div>

        {selectedMethod === 'paypal' && (
          <button 
            className="pay-now-btn"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'Redirecting...' : `Pay with PayPal.me`}
          </button>
        )}
      </div>
    </div>
  );
};

export default Payment;