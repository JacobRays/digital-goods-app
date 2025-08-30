import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './App-new.css';
import AdminPanel from './AdminPanel';
import Payment from './Payment';
import DownloadCenter from './DownloadCenter';
import BatchSelection from './BatchSelection';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [telegramReady, setTelegramReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [activeNav, setActiveNav] = useState('home');
  const [isAdmin, setIsAdmin] = useState(true);

  const [products, setProducts] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [showBatchSelection, setShowBatchSelection] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);

  // Fetch live categories & products on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/categories`)
      .then((res) => res.json())
      .then((data) => setAvailableBatches(data)) // reusing availableBatches
      .catch((e) => console.error('Error fetching categories', e));

    fetch(`${API_BASE}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((e) => console.error('Error fetching products', e));
  }, []);

  // Telegram / User setup
  useEffect(() => {
    setIsAdmin(true);
    setTimeout(() => {
      setTelegramReady(true);
      setUser({ first_name: "User" });
    }, 500);
  }, []);

  const safeNavigate = (view, delay = 100) => {
    setTimeout(() => {
      setActiveView(view);
      setActiveNav(view === 'home' ? 'home' : activeNav);
      setShowPayment(false);
      setShowBatchSelection(false);
      setSelectedBatch(null);
    }, delay);
  };

  const handleBuy = (batch) => {
    setSelectedBatch(batch);
    setShowPayment(true);
  };

  const handleAddToCart = (batch) => {
    setCartItems([...cartItems, batch]);
    setCartCount((c) => c + 1);
    alert(`${batch.name} added to cart!`);
  };

  const calculateCartTotal = () =>
    cartItems.reduce((total, item) => total + (item.price || 0), 0);

  const removeFromCart = (index) => {
    const copy = [...cartItems];
    copy.splice(index, 1);
    setCartItems(copy);
    setCartCount(copy.length);
  };

  const featuredProducts = products.slice(0, 3);

  const getProductsByCategory = (categoryName) =>
    products.filter((p) => p.category === categoryName);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setActiveView('category-products');
    setCategoryProducts(getProductsByCategory(category.name));
  };

const renderTopNavigation = () => (
  <div className="header-with-nav">
    <div className="app-header">
      <h1 className="app-title">Digital Marketplace</h1>
      <p className="app-subtitle">Instant digital goods</p>
    </div>
    <nav className="top-navigation">
      <button
        className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`}
        onClick={() => { setActiveNav('home'); safeNavigate('home'); }}
      >
        🏠 Home
      </button>
      <button
        className={`nav-btn ${activeNav === 'cart' ? 'active' : ''}`}
        onClick={() => { setActiveNav('cart'); safeNavigate('cart'); }}
      >
        🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </button>
      <button
        className={`nav-btn ${activeNav === 'downloads' ? 'active' : ''}`}
        onClick={() => { setActiveNav('downloads'); safeNavigate('downloads'); }}
      >
        📥 My Files {purchases.length > 0 && <span className="cart-badge">{purchases.length}</span>}
      </button>

      {isAdmin && (
        <button
          className={`nav-btn ${activeNav === 'admin' ? 'active' : ''}`}
          onClick={() => { setActiveNav('admin'); safeNavigate('admin'); }}
        >
          ⚙️ Admin
        </button>
      )}
    </nav>
  </div>
);

  const renderHome = () => (
    <div className="view">
      {renderTopNavigation()}

      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Categories</h2>
        <div className="categories-grid">
          {availableBatches.map((category) => (
            <div
              key={category.id}
              className="category-item"
              onClick={() => handleCategorySelect(category)}
            >
              <div className="category-icon" style={{ backgroundColor: category.color }}>
                {category.icon}
              </div>
              <span className="category-name">{category.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Featured</h2>
          <span className="see-all">See all</span>
        </div>
        <div className="products-grid">
          {featuredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">{product.thumbnail}</div>
              <div className="product-content">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="product-footer">
                  <div className="price-section">
                    <span className="price">${product.price}</span>
                    <div className="rating">⭐ {product.rating}</div>
                  </div>
                  <button className="buy-button" onClick={() => handleBuy(product)}>
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
          {featuredProducts.length === 0 && (
            <div className="no-products">
              <p>No featured products yet.</p>
              <p>Add some products in the admin panel!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderCategoryProducts = () => (
    <div className="view">
      <div className="view-header">
        <button className="back-btn" onClick={() => safeNavigate('home')}>
          ← Back to Categories
        </button>
        <h2>{selectedCategory?.icon} {selectedCategory?.name}</h2>
        <p className="category-description">Select from our available lead batches</p>
      </div>
      <div className="products-grid">
        {categoryProducts.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-image">{product.thumbnail}</div>
            <div className="product-details">
              <h3>{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-meta">
                <span className="price">${product.price}</span>
                <div className="rating">⭐ {product.rating}</div>
              </div>
              <div className="product-actions">
                <button className="buy-now-btn" onClick={() => handleBuy(product)}>
                  Buy Now
                </button>
                <button className="add-to-cart-btn" onClick={() => handleAddToCart(product)}>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
        {categoryProducts.length === 0 && (
          <div className="no-products">
            <p>No products found in this category.</p>
            <p>Add some products in the admin panel!</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCart = () => (
    <div className="view">
      <div className="view-header">
        <button className="back-btn" onClick={() => safeNavigate('home')}>
          ← Back
        </button>
        <h2>🛒 Your Cart</h2>
      </div>
      <div className="cart-items">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <button className="continue-shopping-btn" onClick={() => setActiveView('home')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {cartItems.map((item, idx) => (
              <div key={idx} className="cart-item">
                <span className="cart-product-thumb">{item.thumbnail}</span>
                <div className="cart-product-info">
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                </div>
                <div className="cart-product-price">
                  <span>${item.price}</span>
                  <button className="remove-item-btn" onClick={() => removeFromCart(idx)}>
                    ❌
                  </button>
                </div>
              </div>
            ))}
            <div className="cart-total">
              <h3>Total: ${calculateCartTotal()}</h3>
              <button
                className="checkout-btn"
                onClick={() => {
                  setSelectedProduct({ name: 'Cart Items', price: calculateCartTotal(), description: 'Multiple products in cart' });
                  setShowPayment(true);
                }}
              >
                Checkout Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderDownloads = () => (
    <DownloadCenter purchases={purchases} onBack={() => safeNavigate('home')} />
  );

  const renderAdmin = () => <AdminPanel onBack={() => safeNavigate('home')} />;

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
                files: immediateAccess ? (selectedBatch || selectedProduct).files : []
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
