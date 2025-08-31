// src/AdminPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

const AdminPanel = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('batches');
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    appTitle: '',
    appSubtitle: '',
    wallets: { btc: '', eth: '', usdt_trc20: '' },
    accent: '#F0B90B',
  });
  const [purchases, setPurchases] = useState([]);
  const [newBatch, setNewBatch] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    thumbnail: '📦',
    rating: 4.5,
    files: [],
    onSale: false,
    salePercent: 0,
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '📦',
    color: '#6B7280',
    customIcon: null,
  });
  const [editingCategory, setEditingCategory] = useState(null);

  const userId = useMemo(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem('userId', id);
    }
    return id;
  }, []);

  // Socket for realtime purchase updates
  useEffect(() => {
    const socket = io(API_BASE, { transports: ['websocket'] });
    socket.emit('join', { userId });
    socket.on('purchase-updated', (p) => {
      setPurchases((prev) => prev.map((x) => (x._id === p._id ? p : x)));
    });
    return () => socket.disconnect();
  }, [userId]);

  // Initial data
  useEffect(() => {
    (async () => {
      try {
        const [prods, cats, sets, pending, approved] = await Promise.all([
          fetch(`${API_BASE}/api/products`).then((r) => r.json()),
          fetch(`${API_BASE}/api/categories`).then((r) => r.json()),
          fetch(`${API_BASE}/api/settings`).then((r) => r.json()),
          fetch(`${API_BASE}/api/purchases?status=pending`).then((r) => r.json()),
          fetch(`${API_BASE}/api/purchases?status=completed`).then((r) => r.json()),
        ]);
        setProducts(prods || []);
        setCategories(cats || []);
        setSettings(
          sets || {
            appTitle: '',
            appSubtitle: '',
            wallets: { btc: '', eth: '', usdt_trc20: '' },
            accent: '#F0B90B',
          }
        );
        setPurchases([...(pending || []), ...(approved || [])]);
        if (!newBatch.category && (cats || [])[0]) {
          setNewBatch((p) => ({ ...p, category: cats[0].name }));
        }
        document.documentElement.style.setProperty('--accent', (sets && sets.accent) || '#F0B90B');
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    })();
  }, []);

  // ---- Add product
  const addNewBatch = async () => {
    if (!newBatch.name || !newBatch.price) return alert('Name and price are required.');
    const body = { ...newBatch, price: Number(newBatch.price), rating: Number(newBatch.rating || 4.5) };
    try {
      const resp = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return alert('Failed to add batch');
      const prod = await resp.json();
      setProducts((prev) => [prod, ...prev]);
      setNewBatch({
        name: '',
        price: '',
        description: '',
        category: categories[0]?.name || 'Uncategorized',
        thumbnail: '📦',
        rating: 4.5,
        files: [],
        onSale: false,
        salePercent: 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const removeBatch = async (_id) => {
    if (!window.confirm('Delete this product?')) return;
    await fetch(`${API_BASE}/api/products/${_id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((p) => p._id !== _id));
  };

  const addNewCategory = async () => {
    if (!newCategory.name) return alert('Category name required.');
    const resp = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    });
    if (!resp.ok) return alert('Failed to add category');
    const cat = await resp.json();
    setCategories((prev) => [cat, ...prev]);
    setNewCategory({ name: '', icon: '📦', color: '#6B7280', customIcon: null });
  };

  const removeCategory = async (_id) => {
    await fetch(`${API_BASE}/api/categories/${_id}`, { method: 'DELETE' });
    setCategories((prev) => prev.filter((c) => c._id !== _id));
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <div className="admin-tabs">
          <button className={activeTab === 'batches' ? 'active' : ''} onClick={() => setActiveTab('batches')}>
            Batches
          </button>
          <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
            Categories
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
        </div>
      </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <div className="product-form">
          <h3>Add New Product</h3>
          <input placeholder="Name" value={newBatch.name} onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })} />
          <input type="number" placeholder="Price" value={newBatch.price} onChange={(e) => setNewBatch({ ...newBatch, price: e.target.value })} />
          <textarea placeholder="Description" value={newBatch.description} onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })} />
          <select value={newBatch.category} onChange={(e) => setNewBatch({ ...newBatch, category: e.target.value })}>
            {categories.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <button onClick={addNewBatch}>Add Product</button>

          <h3>Existing Products</h3>
          {products.map((p) => (
            <div key={p._id} className="admin-product-card">
              {p.thumbnail} {p.name} - ${p.price}
              <button onClick={() => removeBatch(p._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="product-form">
          <h3>Add New Category</h3>
          <input placeholder="Name" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
          <input type="color" value={newCategory.color} onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })} />
          <button onClick={addNewCategory}>Add Category</button>

          <h3>Existing Categories</h3>
          {categories.map((c) => (
            <div key={c._id} className="admin-product-card">
              {c.icon} {c.name} ({c.color})
              <button onClick={() => removeCategory(c._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="product-form">
          <h3>Store Settings</h3>
          <div className="settings-tabs">
            <button className={activeSettingsTab === 'general' ? 'active' : ''} onClick={() => setActiveSettingsTab('general')}>General</button>
            <button className={activeSettingsTab === 'wallets' ? 'active' : ''} onClick={() => setActiveSettingsTab('wallets')}>Wallets</button>
            <button className={activeSettingsTab === 'appearance' ? 'active' : ''} onClick={() => setActiveSettingsTab('appearance')}>Appearance</button>
          </div>

          {activeSettingsTab === 'general' && (
            <>
              <input placeholder="App Title" value={settings.appTitle} onChange={(e) => setSettings({ ...settings, appTitle: e.target.value })} />
              <input placeholder="App Subtitle" value={settings.appSubtitle} onChange={(e) => setSettings({ ...settings, appSubtitle: e.target.value })} />
            </>
          )}

          {activeSettingsTab === 'wallets' && (
            <>
              <input placeholder="BTC Wallet" value={settings.wallets?.btc || ''} onChange={(e) => setSettings({ ...settings, wallets: { ...settings.wallets, btc: e.target.value } })} />
              <input placeholder="ETH Wallet" value={settings.wallets?.eth || ''} onChange={(e) => setSettings({ ...settings, wallets: { ...settings.wallets, eth: e.target.value } })} />
              <input placeholder="USDT Wallet" value={settings.wallets?.usdt_trc20 || ''} onChange={(e) => setSettings({ ...settings, wallets: { ...settings.wallets, usdt_trc20: e.target.value } })} />
            </>
          )}

          {activeSettingsTab === 'appearance' && (
            <input type="color" value={settings.accent || '#F0B90B'} onChange={(e) => setSettings({ ...settings, accent: e.target.value })} />
          )}

          <button onClick={async () => {
            const resp = await fetch(`${API_BASE}/api/settings`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings),
            });
            if (resp.ok) alert('Settings saved');
          }}>Save Settings</button>
        </div>
      )}

      <button onClick={onBack} style={{ marginTop: 20 }}>Back to Store</button>
    </div>
  );
};

export default AdminPanel;
