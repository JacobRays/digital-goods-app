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

  // ---- Add / Remove product ----
  const addNewBatch = async () => {
    if (!newBatch.name || !newBatch.price) return alert('Name and price are required.');
    const body = {
      name: newBatch.name,
      price: Number(newBatch.price),
      description: newBatch.description,
      category: newBatch.category || 'Uncategorized',
      thumbnail: newBatch.thumbnail,
      rating: Number(newBatch.rating || 4.5),
      files: newBatch.files,
      onSale: !!newBatch.onSale,
      salePercent: newBatch.onSale ? Number(newBatch.salePercent || 0) : 0,
      originalPrice: newBatch.onSale ? Number(newBatch.price) : null,
    };
    try {
      const resp = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Failed to add batch.');
        return;
      }
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
      alert('Batch added successfully!');
    } catch (e) {
      console.error('Add batch error:', e);
      alert('Error adding batch.');
    }
  };

  const removeBatch = async (_id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const resp = await fetch(`${API_BASE}/api/products/${_id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Delete failed.');
        return;
      }
      setProducts((prev) => prev.filter((p) => p._id !== _id));
    } catch (e) {
      console.error('Delete error:', e);
      alert('Error deleting product.');
    }
  };

  const toggleSale = async (product) => {
    const isOn = !product.onSale;
    const salePercent = isOn ? 20 : 0;
    const patch = {
      onSale: isOn,
      salePercent,
      originalPrice: isOn ? product.price : null,
      price: isOn
        ? Number((product.price * (1 - salePercent / 100)).toFixed(2))
        : product.originalPrice || product.price,
    };
    try {
      const resp = await fetch(`${API_BASE}/api/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Failed to toggle sale.');
        return;
      }
      const updated = await resp.json();
      setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    } catch (e) {
      console.error('Toggle sale error:', e);
      alert('Error updating sale status.');
    }
  };

  const updateCategory = async () => {
    try {
      const body = { ...editingCategory };
      const resp = await fetch(`${API_BASE}/api/categories/${editingCategory._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Failed to update category.');
        return;
      }
      const updated = await resp.json();
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setEditingCategory(null);
    } catch (e) {
      console.error('Update category error:', e);
      alert('Error updating category.');
    }
  };

  const removeCategory = async (_id) => {
    try {
      const resp = await fetch(`${API_BASE}/api/categories/${_id}`, { method: 'DELETE' });
      if (resp.ok) {
        setCategories((prev) => prev.filter((c) => c._id !== _id));
      } else {
        const e = await resp.json().catch(() => ({}));
        alert(e.error || 'Cannot remove category.');
      }
    } catch (e) {
      console.error('Remove category error:', e);
      alert('Error removing category.');
    }
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
          {/* form inputs unchanged... */}
          <button type="button" className="submit-btn" onClick={addNewBatch}>
            Add Product
          </button>

          <div className="products-list">
            <h3>Existing Products ({products.length})</h3>
            {products.length === 0 ? (
              <div className="no-products">No products added yet.</div>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <div key={product._id} className="admin-product-card">
                    <div className="product-header">
                      <div className="product-thumbnail">{product.thumbnail}</div>
                      <div className="product-info">
                        <h4>{product.name}</h4>
                        <div className="product-price">
                          ${product.price}
                          {product.onSale && <span className="sale-badge">{product.salePercent}% OFF</span>}
                        </div>
                        <div className="product-category">{product.category}</div>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button
                        className={product.onSale ? 'active-btn' : 'inactive-btn'}
                        onClick={() => toggleSale(product)}
                      >
                        {product.onSale ? 'Remove Sale' : 'Put on Sale'}
                      </button>
                      <button className="delete-btn" onClick={() => removeBatch(product._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="product-form">
          <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
          {/* form inputs unchanged... */}
          <div className="products-list">
            <h3>Existing Categories ({categories.length})</h3>
            {categories.length === 0 ? (
              <div className="no-products">No categories added yet.</div>
            ) : (
              <div className="products-grid">
                {categories.map((category) => (
                  <div key={category._id} className="admin-product-card">
                    <div className="product-header">
                      <div
                        className="product-thumbnail"
                        style={{ backgroundColor: category.color, borderRadius: 10 }}
                      >
                        {category.customIcon ? (
                          <img src={`${API_BASE}${category.customIcon}`} alt={category.name} style={{ width: 30, height: 30 }} />
                        ) : (
                          category.icon
                        )}
                      </div>
                      <div className="product-info">
                        <h4>{category.name}</h4>
                        <div style={{ color: category.color, fontSize: 12 }}>{category.color}</div>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button className="edit-btn" onClick={() => setEditingCategory({ ...category })}>
                        Edit
                      </button>
                      <button className="delete-btn" onClick={() => removeCategory(category._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings tab remains the same as fixed earlier */}

      {/* Back button */}
      <button className="cancel-btn" onClick={onBack} style={{ marginTop: 20 }}>
        Back to Store
      </button>
    </div>
  );
};

export default AdminPanel;
