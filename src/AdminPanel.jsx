import React, { useState, useEffect } from 'react';

const AdminPanel = ({ products, setProducts, onBack }) => {
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab]);

  const fetchPayments = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/crypto-payments');
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/crypto-payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (response.ok) {
        alert('Payment approved! User now has access to their files.');
        fetchPayments();
      } else {
        alert('Error approving payment.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error approving payment.');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/crypto-payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (response.ok) {
        alert('Payment rejected.');
        fetchPayments();
      } else {
        alert('Error rejecting payment.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error rejecting payment.');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Admin Panel</h2>
        <div className="admin-tabs">
          <button 
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button 
            className={activeTab === 'payments' ? 'active' : ''}
            onClick={() => setActiveTab('payments')}
          >
            Crypto Payments
          </button>
        </div>
      </div>

      {activeTab === 'products' && (
        // Your existing product management code
        <div className="products-management">
          <h3>Product Management</h3>
          {/* ... rest of your product management UI ... */}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="payments-management">
          <h3>Crypto Payment Management</h3>
          <div className="payments-list">
            {payments.length === 0 ? (
              <div className="no-payments">
                <p>No pending crypto payments.</p>
              </div>
            ) : (
              payments.map(payment => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-info">
                    <h4>{payment.product.name}</h4>
                    <p>User ID: {payment.userId}</p>
                    <p>Amount: ${payment.amount}</p>
                    <p>Currency: {payment.cryptoCurrency}</p>
                    <p>Status: 
                      <span className={`status ${payment.status}`}>
                        {payment.status}
                      </span>
                    </p>
                    <p>Date: {new Date(payment.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="payment-actions">
                    {payment.status === 'pending' && (
                      <>
                        <button 
                          className="approve-btn"
                          onClick={() => handleApprovePayment(payment.id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleRejectPayment(payment.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {payment.status === 'approved' && (
                      <span className="approved-text">
                        Approved on {new Date(payment.approvedAt).toLocaleString()}
                      </span>
                    )}
                    {payment.status === 'rejected' && (
                      <span className="rejected-text">Rejected</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;