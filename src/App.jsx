import React, { useState, useEffect } from 'react';
import './App-new.css';
import AdminPanel from './AdminPanel';
import Payment from './Payment';
import DownloadCenter from './DownloadCenter';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

function App() {
  // ... (all your state variables remain the same)

  const renderAdmin = () => (
    <AdminPanel 
      onBack={() => {
        // Refresh products and categories when leaving admin panel
        fetchProducts();
        fetchCategories();
        safeNavigate('home');
      }} 
    />
  );

  return (
    <div className="app">
      <div className="app-container">
        {activeView === 'home' && renderHome()}
        {activeView === 'category-products' && renderCategoryProducts()}
        {activeView === 'cart' && renderCart()}
        {activeView === 'downloads' && renderDownloads()}
        {activeView === 'admin' && renderAdmin()}

        {showPayment && (
          <Payment
            product={selectedBatch || selectedProduct}
            onClose={() => safeNavigate('home')}
            onSuccess={(immediateAccess) => {
              if (selectedProduct && selectedProduct.name === 'Cart Items') {
                setCartItems([]);
                setCartCount(0);
              }
              const purchase = {
                id: Date.now(),
                product: selectedBatch || selectedProduct,
                date: new Date().toLocaleString(),
                status: immediateAccess ? 'completed' : 'pending',
                files: immediateAccess ? (selectedBatch || selectedProduct).files : [],
              };
              setPurchases((p) => [...p, purchase]);
              safeNavigate(immediateAccess ? 'downloads' : 'home');
            }}
          />
        )}

        {(activeView === '' || activeView === undefined) && (
          <div className="emergency-nav">
            <h3>Navigation</h3>
            <button onClick={() => safeNavigate('home', 0)}>Go Home</button>
            <button onClick={() => safeNavigate('downloads', 0)}>My Downloads</button>
          </div>
        )}

        {isAdmin && activeView !== 'admin' && (
          <div className="floating-admin-btn" onClick={() => safeNavigate('admin')}>
            ⚙️
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
