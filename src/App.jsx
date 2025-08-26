import React, { useState, useEffect } from 'react';
import './App-new.css';
import AdminPanel from './AdminPanel';
import Payment from './Payment';
import DownloadCenter from './DownloadCenter';
import BatchSelection from './BatchSelection';

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

  console.log('Current activeView:', activeView);
  console.log('showBatchSelection:', showBatchSelection);
  console.log('showPayment:', showPayment);
  console.log('Selected product:', selectedProduct);

  const safeNavigate = (view, delay = 100) => {
    setTimeout(() => {
      setActiveView(view);
      setActiveNav(view === 'home' ? 'home' : activeNav);
      setShowPayment(false);
      setShowBatchSelection(false);
    }, delay);
  };

  const handleBuy = (product) => {
    if (product.batches) {
      setSelectedProduct(product);
      setShowBatchSelection(true);
    } else {
      setSelectedProduct(product);
      setShowPayment(true);
    }
  };

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setShowBatchSelection(false);
    setShowPayment(true);
  };

  const getProductForPayment = () => {
    if (selectedBatch) {
      return {
        ...selectedProduct,
        name: `${selectedProduct.name} - ${selectedBatch.name}`,
        price: selectedBatch.price,
        files: selectedBatch.files
      };
    }
    return selectedProduct;
  };

  useEffect(() => {
    if (products.length === 0) {
      setProducts([
        {
          id: 1,
          name: 'Business Leads',
          basePrice: 30,
          description: 'High-quality verified business leads',
          thumbnail: '📊',
          category: 'Business leads',
          rating: 4.8,
          batches: [
            {
              id: 'premium-1',
              name: 'Premium Leads - Batch 1',
              price: 40,
              description: '100 premium leads with full contact details',
              files: [
                { name: 'Premium_Leads_Batch_1.csv', url: '/downloads/premium_batch_1.csv', type: 'csv' },
                { name: 'Instructions.pdf', url: '/downloads/instructions.pdf', type: 'pdf' }
              ]
            },
            {
              id: 'premium-2', 
              name: 'Premium Leads - Batch 2',
              price: 40,
              description: '100 premium leads from different industry',
              files: [
                { name: 'Premium_Leads_Batch_2.csv', url: '/downloads/premium_batch_2.csv', type: 'csv' },
                { name: 'Instructions.pdf', url: '/downloads/instructions.pdf', type: 'pdf' }
              ]
            },
            {
              id: 'standard-1',
              name: 'Standard Leads - Batch 1',
              price: 25,
              description: '100 standard leads with basic info',
              files: [
                { name: 'Standard_Leads_Batch_1.csv', url: '/downloads/standard_batch_1.csv', type: 'csv' },
                { name: 'Instructions.pdf', url: '/downloads/instructions.pdf', type: 'pdf' }
              ]
            }
          ]
        },
        {
          id: 2,
          name: 'Marketing Course',
          price: 100,
          description: 'Complete digital marketing guide',
          thumbnail: '🎓',
          category: 'Courses',
          rating: 4.9,
          files: [
            { name: 'Course_Videos.zip', url: '/downloads/course.zip', type: 'zip' },
            { name: 'Workbook.pdf', url: '/downloads/workbook.pdf', type: 'pdf' }
          ]
        }
      ]);
    }
  }, []);

  const categories = [
    { id: 1, name: 'Business leads', icon: '📊', color: '#3B82F6' },
    { id: 2, name: 'Crypto', icon: '💰', color: '#F59E0B' },
    { id: 3, name: 'Courses', icon: '📚', color: '#EF4444' },
    { id: 4, name: 'Software', icon: '⚙️', color: '#10B981' },
    { id: 5, name: 'Design', icon: '🎨', color: '#8B5CF6' },
    { id: 6, name: 'Lifestyle', icon: '🌿', color: '#EC4899' }
  ];

  const featuredProducts = products.slice(0, 2);

  const getProductsByCategory = (categoryName) => {
    return products.filter(product => product.category === categoryName);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setActiveView('category-products');
    const categoryProducts = getProductsByCategory(category.name);
    setCategoryProducts(categoryProducts);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setActiveView('product');
  };

  useEffect(() => {
    setIsAdmin(true);
    setTimeout(() => {
      setTelegramReady(true);
      setUser({ first_name: "User" });
    }, 500);
  }, []);

  const handleAddToCart = (product) => {
    setCartCount(prev => prev + 1);
    alert(`${product.name} added to cart!`);
  };

  const handleNavClick = (navItem) => {
    setActiveNav(navItem);
    if (navItem === 'home') setActiveView('home');
    if (navItem === 'cart') setActiveView('cart');
    if (navItem === 'downloads') setActiveView('downloads');
    if (navItem === 'admin') setActiveView('admin');
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
          onClick={() => handleNavClick('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-text">Home</span>
        </button>
        
        <button 
          className={`nav-btn ${activeNav === 'cart' ? 'active' : ''}`}
          onClick={() => handleNavClick('cart')}
        >
          <span className="nav-icon">🛒</span>
          <span className="nav-text">Cart</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
        
        <button 
          className={`nav-btn ${activeNav === 'downloads' ? 'active' : ''}`}
          onClick={() => handleNavClick('downloads')}
        >
          <span className="nav-icon">📥</span>
          <span className="nav-text">My Files</span>
          {purchases.length > 0 && <span className="cart-badge">{purchases.length}</span>}
        </button>
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
          {categories.map(category => (
            <div 
              key={category.id} 
              className="category-item"
              onClick={() => handleCategorySelect(category)}
            >
              <div 
                className="category-icon" 
                style={{ backgroundColor: category.color }}
              >
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
          {featuredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                {product.thumbnail}
              </div>
              <div className="product-content">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="product-footer">
                  <div className="price-section">
                    <span className="price">${product.price}</span>
                    <div className="rating">
                      ⭐ {product.rating}
                    </div>
                  </div>
                  <button 
                    className="buy-button"
                    onClick={() => handleBuy(product)}
                  >
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
        <button className="back-btn" onClick={() => setActiveView('home')}>← Back to Categories</button>
        <h2>{selectedCategory?.icon} {selectedCategory?.name} - Available Batches</h2>
      </div>

      <div className="products-grid">
        {categoryProducts.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image">{product.thumbnail}</div>
            <div className="product-details">
              <h3>{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-meta">
                <span className="price">${product.price}</span>
                <div className="product-actions">
                  <button 
                    className="buy-now-btn"
                    onClick={() => handleBuy(product)}
                  >
                    Buy Now
                  </button>
                  <button 
                    className="add-to-cart-btn"
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
                  </button>
                </div>
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

  const renderProduct = () => (
    <div className="view">
      <div className="view-header">
        <button className="back-btn" onClick={() => setActiveView('category-products')}>← Back</button>
        <h2>Product Details</h2>
      </div>
      
      <div className="product-detail-view">
        <div className="product-detail-image">
          {selectedProduct?.thumbnail}
        </div>
        <div className="product-detail-content">
          <h2>{selectedProduct?.name}</h2>
          <p className="product-detail-desc">{selectedProduct?.description}</p>
          <div className="product-detail-meta">
            <span className="product-detail-price">${selectedProduct?.price}</span>
            <div className="product-detail-rating">⭐ {selectedProduct?.rating}</div>
          </div>
          <button className="buy-now-btn" onClick={() => handleBuy(selectedProduct)}>
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );

  const renderCart = () => (
    <div className="view">
      <div className="view-header">
        <button className="back-btn" onClick={() => setActiveView('home')}>← Back</button>
        <h2>🛒 Your Cart</h2>
      </div>
      
      <div className="cart-items">
        {cartCount === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <button 
              className="continue-shopping-btn"
              onClick={() => setActiveView('home')}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div>
            <div className="cart-item">
              <span className="cart-product-thumb">📊</span>
              <div className="cart-product-info">
                <h4>Business Leads Package</h4>
                <p>100 verified leads with contact info</p>
              </div>
              <div className="cart-product-price">
                <span>$30.00</span>
                <button className="remove-item-btn">❌</button>
              </div>
            </div>
            
            <div className="cart-total">
              <h3>Total: $30.00</h3>
              <button 
                className="checkout-btn"
                onClick={() => {
                  setSelectedProduct({
                    name: "Cart Items",
                    price: 30,
                    description: "Multiple products in cart"
                  });
                  setShowPayment(true);
                }}
              >
                Checkout Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!telegramReady) {
    return (
      <div className="loading-screen">
        <div className="loader">🛒</div>
        <p>Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-container">
        {activeView === 'home' && renderHome()}
        {activeView === 'category-products' && renderCategoryProducts()}
        {activeView === 'product' && renderProduct()}
        {activeView === 'admin' && (
          <div>
            <div className="view-header">
              <button className="back-btn" onClick={() => safeNavigate('home')}>
                ← Back to Home
              </button>
              <h2>Admin Panel</h2>
            </div>
            <AdminPanel 
              products={products}
              setProducts={setProducts}
              onBack={() => safeNavigate('home')}
            />
          </div>
        )}
        {activeView === 'cart' && renderCart()}
        {activeView === 'downloads' && (
          <DownloadCenter 
            purchases={purchases}
            onBack={() => setActiveView('home')}
          />
        )}
        
        {showBatchSelection && (
          <BatchSelection 
            product={selectedProduct}
            onSelectBatch={handleBatchSelect}
            onClose={() => {
              setShowBatchSelection(false);
              setActiveView('category-products');
            }}
          />
        )}

        {showPayment && (
          <Payment 
            product={getProductForPayment()}
            onClose={() => safeNavigate('home')}
            onSuccess={(immediateAccess) => {
              setCartCount(prev => prev + 1);
              
              const purchase = {
                id: Date.now(),
                product: getProductForPayment(),
                date: new Date().toLocaleString(),
                status: immediateAccess ? 'completed' : 'pending',
                files: immediateAccess ? getProductForPayment().files : []
              };
              
              setPurchases([...purchases, purchase]);
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