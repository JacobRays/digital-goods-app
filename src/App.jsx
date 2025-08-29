import { useState, useEffect } from 'react';
import './App-new.css';
import AdminPanel from './AdminPanel';
import Payment from './Payment';
import DownloadCenter from './DownloadCenter';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [activeNav, setActiveNav] = useState('home');
  const [isAdmin, setIsAdmin] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [telegramReady, setTelegramReady] = useState(false);

  // --- Fallback demo data ---
  const fallbackCategories = [
    { id: 1, name: 'Business leads', icon: '📊', color: '#3B82F6' },
    { id: 2, name: 'Crypto', icon: '💰', color: '#F59E0B' },
    { id: 3, name: 'Courses', icon: '📚', color: '#EF4444' },
    { id: 4, name: 'Software', icon: '⚙️', color: '#10B981' },
    { id: 5, name: 'Design', icon: '🎨', color: '#8B5CF6' },
    { id: 6, name: 'Lifestyle', icon: '🌿', color: '#EC4899' }
  ];

  const fallbackProducts = [
    {
      id: 'law-leads-1',
      name: 'Law Firm Leads - Batch 1',
      price: 40,
      description: '100 premium law firm leads with full contact details',
      thumbnail: '⚖️',
      category: 'Business leads',
      rating: 4.8
    },
    {
      id: 'real-estate-1',
      name: 'Real Estate Leads - Batch 1',
      price: 35,
      description: '100 real estate agent leads with contact info',
      thumbnail: '🏠',
      category: 'Business leads',
      rating: 4.6
    },
    {
      id: 'marketing-course',
      name: 'Marketing Course',
      price: 100,
      description: 'Complete digital marketing guide',
      thumbnail: '🎓',
      category: 'Courses',
      rating: 4.9
    }
  ];

  // --- Fetch backend data with fallback ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch(`${API_BASE}/api/categories`).then(r => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/products`).then(r => r.json()).catch(() => [])
        ]);

        setCategories(catRes.length > 0 ? catRes : fallbackCategories);
        setProducts(prodRes.length > 0 ? prodRes : fallbackProducts);
      } catch (err) {
        console.error('Error fetching data:', err);
        setCategories(fallbackCategories);
        setProducts(fallbackProducts);
      }
    };
    fetchData();
  }, []);

  const featuredProducts = products.slice(0, 3);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setActiveView('category-products');
    const filtered = products.filter(p => p.category === category.name);
    setCategoryProducts(filtered);
  };

  const handleBuy = (product) => {
    setSelectedBatch(product);
    setShowPayment(true);
  };

  const handleAddToCart = (product) => {
    setCartItems([...cartItems, product]);
    setCartCount(prev => prev + 1);
  };

  const safeNavigate = (view) => {
    setActiveView(view);
    setShowPayment(false);
    setSelectedBatch(null);
  };

  // --- UI renderers ---
  const renderTopNavigation = () => (
    <div className="header-with-nav">
      <div className="app-header">
        <h1 className="app-title">Digital Marketplace</h1>
        <p className="app-subtitle">Instant digital goods</p>
      </div>
      <nav className="top-navigation">
        <button className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`} onClick={() => { setActiveNav('home'); safeNavigate('home'); }}>🏠 Home</button>
        <button className={`nav-btn ${activeNav === 'cart' ? 'active' : ''}`} onClick={() => { setActiveNav('cart'); safeNavigate('cart'); }}>🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</button>
        <button className={`nav-btn ${activeNav === 'downloads' ? 'active' : ''}`} onClick={() => { setActiveNav('downloads'); safeNavigate('downloads'); }}>📥 My Files {purchases.length > 0 && <span className="cart-badge">{purchases.length}</span>}</button>
      </nav>
    </div>
  );

  const renderHome = () => (
    <div className="view">
      {renderTopNavigation()}
      <section className="section">
        <h2 className="section-title">Categories</h2>
        <div className="categories-grid">
          {categories.map(c => (
            <div key={c.id} className="category-item" onClick={() => handleCategorySelect(c)}>
              <div className="category-icon" style={{ backgroundColor: c.color }}>{c.icon}</div>
              <span className="category-name">{c.name}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2 className="section-title">Featured</h2>
        <div className="products-grid">
          {featuredProducts.map(p => (
            <div key={p.id} className="product-card">
              <div className="product-image">{p.thumbnail}</div>
              <div className="product-content">
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="product-footer">
                  <span className="price">${p.price}</span>
                  <button onClick={() => handleBuy(p)}>Buy Now</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderCategoryProducts = () => (
    <div className="view">
      <button onClick={() => safeNavigate('home')}>← Back</button>
      <h2>{selectedCategory?.icon} {selectedCategory?.name}</h2>
      <div className="products-grid">
        {categoryProducts.map(p => (
          <div key={p.id} className="product-card">
            <div className="product-image">{p.thumbnail}</div>
            <div className="product-details">
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <span className="price">${p.price}</span>
              <button onClick={() => handleBuy(p)}>Buy Now</button>
              <button onClick={() => handleAddToCart(p)}>Add to Cart</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

return (
  <div className="app">
    {activeView === 'home' && renderHome()}
    {activeView === 'category-products' && renderCategoryProducts()}
    {activeView === 'admin' && <AdminPanel onBack={() => safeNavigate('home')} />}
    {activeView === 'downloads' && (
      <DownloadCenter purchases={purchases} onBack={() => safeNavigate('home')} />
    )}
    {showPayment && (
      <Payment
        product={selectedBatch || selectedProduct}
        onClose={() => safeNavigate('home')}
      />
    )}
  </div>
);
}
