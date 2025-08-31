// src/AdminPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

// Helper to work with either `_id` or `id`
const getId = (obj) => (obj && (obj._id || obj.id)) || null;

const defaultSettings = {
  appTitle: 'Digital Marketplace',
  appSubtitle: 'Instant digital goods',
  wallets: { btc: '', eth: '', usdt_trc20: '' },
  accent: '#F0B90B',
};

const AdminPanel = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('batches');
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
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
      const pid = getId(p);
      setPurchases((prev) => prev.map((x) => (getId(x) === pid ? p : x)));
    });
    return () => socket.disconnect();
  }, [userId]);

  // Initial data
  useEffect(() => {
    (async () => {
      try {
        const [prods, cats, sets, pending, approved] = await Promise.all([
          fetch(`${API_BASE}/api/products`).then((r) => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/categories`).then((r) => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/settings`).then((r) => r.json()).catch(() => ({})),
          fetch(`${API_BASE}/api/purchases?status=pending`).then((r) => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/purchases?status=completed`).then((r) => r.json()).catch(() => []),
        ]);

        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(Array.isArray(cats) ? cats : []);
        // Merge defaults so settings UI always renders
        setSettings({ ...defaultSettings, ...(sets || {}) });
        setPurchases([...(Array.isArray(pending) ? pending : []), ...(Array.isArray(approved) ? approved : [])]);

        // Default category for new batch
        if (!newBatch.category && (cats || [])[0]?.name) {
          setNewBatch((p) => ({ ...p, category: cats[0].name }));
        }

        // Accent color to CSS variable
        document.documentElement.style.setProperty('--accent', (sets && sets.accent) || defaultSettings.accent);
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingPayments = purchases.filter(
    (p) => p?.status === 'pending' && p?.paymentMethod === 'crypto'
  );

  // ---- Product file upload ----
  const handleFilesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const resp = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'File upload failed.');
        return;
      }
      const result = await resp.json();
      setNewBatch((prev) => ({
        ...prev,
        files: [...prev.files, ...((result && result.files) || [])],
      }));
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading files.');
    }
  };

  const removeFile = (idx) => {
    setNewBatch((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== idx),
    }));
  };

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
        alert(err.error || 'Failed to add product.');
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
      alert('Product added successfully!');
    } catch (e) {
      console.error('Add product error:', e);
      alert('Error adding product.');
    }
  };

  const removeBatch = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    const pid = id;
    try {
      const resp = await fetch(`${API_BASE}/api/products/${pid}`, { method: 'DELETE' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Delete failed.');
        return;
      }
      setProducts((prev) => prev.filter((p) => getId(p) !== pid));
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
    const pid = getId(product);
    try {
      const resp = await fetch(`${API_BASE}/api/products/${pid}`, {
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
      const uid = getId(updated);
      setProducts((prev) => prev.map((p) => (getId(p) === uid ? updated : p)));
    } catch (e) {
      console.error('Toggle sale error:', e);
      alert('Error updating sale status.');
    }
  };

  // ---- Payments Approvals (UI not changed, functions intact) ----
  const approvePayment = async (purchaseId) => {
    try {
      const resp = await fetch(`${API_BASE}/api/purchases/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Failed to approve payment.');
        return;
      }
      const updated = await resp.json();
      const uid = getId(updated);
      setPurchases((prev) => prev.map((p) => (getId(p) === uid ? updated : p)));
      alert('Payment approved! User now has access to download files.');
    } catch (e) {
      console.error('Approve error:', e);
      alert('Error approving payment.');
    }
  };

  const rejectPayment = async (purchaseId) => {
    try {
      const resp = await fetch(`${API_BASE}/api/purchases/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Failed to reject payment.');
        return;
      }
      const updated = await resp.json();
      const uid = getId(updated);
      setPurchases((prev) => prev.map((p) => (getId(p) === uid ? updated : p)));
      alert('Payment rejected.');
    } catch (e) {
      console.error('Reject error:', e);
      alert('Error rejecting payment.');
    }
  };

  // ---- Categories ----
  const uploadIcon = async (e, setter) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const resp = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Icon upload failed.');
        return;
      }
      const result = await resp.json();
      const iconUrl = result?.files?.[0]?.url || null;
      setter(iconUrl);
    } catch (err) {
      console.error('Icon upload error:', err);
      alert('Error uploading icon.');
    }
  };

  const addNewCategory = async () => {
    if (!newCategory.name) return alert('Category name required.');
    try {
      const body = { ...newCategory };
      const resp = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Failed to add category.');
        return;
      }
      const cat = await resp.json();
      setCategories((prev) => [cat, ...prev]);
      setNewCategory({ name: '', icon: '📦', color: '#6B7280', customIcon: null });
      alert('Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category.');
    }
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    const cid = getId(editingCategory);
    try {
      const body = { ...editingCategory };
      const resp = await fetch(`${API_BASE}/api/categories/${cid}`, {
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
      const uid = getId(updated);
      setCategories((prev) => prev.map((c) => (getId(c) === uid ? updated : c)));
      setEditingCategory(null);
    } catch (e) {
      console.error('Update category error:', e);
      alert('Error updating category.');
    }
  };

  const removeCategory = async (id) => {
    const cid = id;
    try {
      const resp = await fetch(`${API_BASE}/api/categories/${cid}`, { method: 'DELETE' });
      if (resp.ok) {
        setCategories((prev) => prev.filter((c) => getId(c) !== cid));
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
          <button
            className={activeTab === 'batches' ? 'active' : ''}
            onClick={() => setActiveTab('batches')}
          >
            Batches
          </button>
          <button
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <div className="product-form">
          <h3>Add New Product</h3>

          <div className="form-group">
            <label>Product Name</label>
            <input
              value={newBatch.name}
              onChange={(e) => setNewBatch((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Business Plan Template"
            />
          </div>

          <div className="form-group">
            <label>Price ($)</label>
            <input
              type="number"
              value={newBatch.price}
              onChange={(e) => setNewBatch((p) => ({ ...p, price: e.target.value }))}
              placeholder="e.g. 19.99"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newBatch.description}
              onChange={(e) => setNewBatch((p) => ({ ...p, description: e.target.value }))}
              placeholder="Product description."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={newBatch.category}
              onChange={(e) => setNewBatch((p) => ({ ...p, category: e.target.value }))}
            >
              {categories.map((cat) => (
                <option key={getId(cat)} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Thumbnail Emoji</label>
            <input
              value={newBatch.thumbnail}
              onChange={(e) => setNewBatch((p) => ({ ...p, thumbnail: e.target.value }))}
              placeholder="e.g. 📦"
            />
          </div>

          <div className="form-group">
            <label>Rating</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={newBatch.rating}
              onChange={(e) => setNewBatch((p) => ({ ...p, rating: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Files</label>
            <input type="file" multiple onChange={handleFilesUpload} />
            <div className="file-list">
              {newBatch.files.map((file, idx) => (
                <div key={idx} className="file-item">
                  <span>{file.name || file.originalName || file.url || 'file'}</span>
                  <button onClick={() => removeFile(idx)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={newBatch.onSale}
                onChange={(e) => setNewBatch((p) => ({ ...p, onSale: e.target.checked }))}
              />
              On Sale
            </label>
          </div>

          {newBatch.onSale && (
            <div className="form-group">
              <label>Sale Percentage</label>
              <input
                type="number"
                value={newBatch.salePercent}
                onChange={(e) => setNewBatch((p) => ({ ...p, salePercent: e.target.value }))}
                placeholder="e.g. 20"
              />
            </div>
          )}

          <button type="button" className="submit-btn" onClick={addNewBatch}>
            Add Product
          </button>

          <div className="products-list">
            <h3>Existing Products ({products.length})</h3>
            {products.length === 0 ? (
              <div className="no-products">No products added yet.</div>
            ) : (
              <div className="products-grid">
                {products.map((product) => {
                  const pid = getId(product);
                  return (
                    <div key={pid} className="admin-product-card">
                      <div className="product-header">
                        <div className="product-thumbnail">{product.thumbnail}</div>
                        <div className="product-info">
                          <h4>{product.name}</h4>
                          <div className="product-price">
                            ${product.price}
                            {product.onSale && (
                              <span className="sale-badge">{product.salePercent}% OFF</span>
                            )}
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
                        <button className="delete-btn" onClick={() => removeBatch(pid)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="product-form">
          <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>

          {editingCategory ? (
            <>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Icon Selection</label>
                <div className="thumbnail-grid">
                  {['📊', '💰', '📚', '⚙️', '🎨', '🌿', '⚖️', '🏠', '👔', '💻', '📱', '🔍'].map(
                    (emoji) => (
                      <div
                        key={emoji}
                        className={`thumbnail-option ${
                          editingCategory.icon === emoji ? 'selected' : ''
                        }`}
                        onClick={() =>
                          setEditingCategory((c) => ({ ...c, icon: emoji }))
                        }
                      >
                        {emoji}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Or Upload Custom Icon</label>
                <label className="file-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) =>
                      uploadIcon(e, (url) =>
                        setEditingCategory((c) => ({ ...c, customIcon: url }))
                      )
                    }
                  />
                  {editingCategory.customIcon ? 'Change Icon' : 'Upload Icon'}
                </label>
                {editingCategory.customIcon && (
                  <img
                    src={`${API_BASE}${editingCategory.customIcon}`}
                    alt="icon"
                    style={{ width: 40, height: 40, marginTop: 10, borderRadius: 8 }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) =>
                    setEditingCategory((c) => ({ ...c, color: e.target.value }))
                  }
                  style={{ height: 40 }}
                />
              </div>

              <button type="button" className="submit-btn" onClick={updateCategory}>
                Save Changes
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="e.g. Real Estate"
                />
              </div>

              <div className="form-group">
                <label>Icon Selection</label>
                <div className="thumbnail-grid">
                  {['📊', '💰', '📚', '⚙️', '🎨', '🌿', '⚖️', '🏠', '👔', '💻', '📱', '🔍'].map(
                    (emoji) => (
                      <div
                        key={emoji}
                        className={`thumbnail-option ${
                          newCategory.icon === emoji ? 'selected' : ''
                        }`}
                        onClick={() => setNewCategory((c) => ({ ...c, icon: emoji }))}
                      >
                        {emoji}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Or Upload Custom Icon</label>
                <label className="file-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      try {
                        const form = new FormData();
                        files.forEach((f) => form.append('files', f));
                        const resp = await fetch(`${API_BASE}/api/upload`, {
                          method: 'POST',
                          body: form,
                        });
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({}));
                          alert(err.error || 'Icon upload failed.');
                          return;
                        }
                        const result = await resp.json();
                        const url = result?.files?.[0]?.url || null;
                        setNewCategory((prev) => ({ ...prev, customIcon: url }));
                      } catch (err) {
                        console.error('Upload icon error:', err);
                        alert('Error uploading icon.');
                      }
                    }}
                  />
                  {newCategory.customIcon ? 'Change Icon' : 'Upload Icon'}
                </label>

                {newCategory.customIcon && (
                  <img
                    src={`${API_BASE}${newCategory.customIcon}`}
                    alt="icon"
                    style={{ width: 40, height: 40, marginTop: 10, borderRadius: 8 }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) =>
                    setNewCategory((c) => ({ ...c, color: e.target.value }))
                  }
                  style={{ height: 40 }}
                />
              </div>

              <button type="button" className="submit-btn" onClick={addNewCategory}>
                Add Category
              </button>
            </>
          )}

          <div className="products-list">
            <h3>Existing Categories ({categories.length})</h3>
            {categories.length === 0 ? (
              <div className="no-products">No categories added yet.</div>
            ) : (
              <div className="products-grid">
                {categories.map((category) => {
                  const cid = getId(category);
                  return (
                    <div key={cid} className="admin-product-card">
                      <div className="product-header">
                        <div
                          className="product-thumbnail"
                          style={{ backgroundColor: category.color, borderRadius: 10 }}
                        >
                          {category.customIcon ? (
                            <img
                              src={`${API_BASE}${category.customIcon}`}
                              alt={category.name}
                              style={{ width: 30, height: 30 }}
                            />
                          ) : (
                            category.icon
                          )}
                        </div>
                        <div className="product-info">
                          <h4>{category.name}</h4>
                          <div style={{ color: category.color, fontSize: 12 }}>
                            {category.color}
                          </div>
                        </div>
                      </div>
                      <div className="product-actions">
                        <button
                          className="edit-btn"
                          onClick={() => setEditingCategory({ ...category })}
                        >
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => removeCategory(cid)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="product-form">
          <h3>Store Settings</h3>

          <div className="settings-tabs">
            <button
              className={activeSettingsTab === 'general' ? 'active' : ''}
              onClick={() => setActiveSettingsTab('general')}
            >
              General
            </button>
            <button
              className={activeSettingsTab === 'wallets' ? 'active' : ''}
              onClick={() => setActiveSettingsTab('wallets')}
            >
              Crypto Wallets
            </button>
            <button
              className={activeSettingsTab === 'appearance' ? 'active' : ''}
              onClick={() => setActiveSettingsTab('appearance')}
            >
              Appearance
            </button>
          </div>

          {activeSettingsTab === 'general' && (
            <>
              <div className="form-group">
                <label>App Title</label>
                <input
                  value={settings.appTitle || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, appTitle: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>App Subtitle</label>
                <input
                  value={settings.appSubtitle || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, appSubtitle: e.target.value }))}
                />
              </div>
            </>
          )}

          {activeSettingsTab === 'wallets' && (
            <>
              <div className="form-group">
                <label>BTC Wallet Address</label>
                <input
                  value={settings.wallets?.btc || ''}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, wallets: { ...(s.wallets || {}), btc: e.target.value } }))
                  }
                />
              </div>
              <div className="form-group">
                <label>ETH Wallet Address</label>
                <input
                  value={settings.wallets?.eth || ''}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, wallets: { ...(s.wallets || {}), eth: e.target.value } }))
                  }
                />
              </div>
              <div className="form-group">
                <label>USDT (TRC20) Wallet Address</label>
                <input
                  value={settings.wallets?.usdt_trc20 || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      wallets: { ...(s.wallets || {}), usdt_trc20: e.target.value },
                    }))
                  }
                />
              </div>
            </>
          )}

          {activeSettingsTab === 'appearance' && (
            <>
              <div className="form-group">
                <label>Accent Color</label>
                <input
                  type="color"
                  value={settings.accent || defaultSettings.accent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((s) => ({ ...s, accent: val }));
                    document.documentElement.style.setProperty('--accent', val);
                  }}
                  style={{ height: 40 }}
                />
              </div>
            </>
          )}

          <button
            type="button"
            className="submit-btn"
            onClick={async () => {
              try {
                const resp = await fetch(`${API_BASE}/api/settings`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(settings),
                });

                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({}));
                  alert(err.error || 'Failed to save settings.');
                  return;
                }

                const updated = await resp.json();
                setSettings({ ...defaultSettings, ...(updated || {}) });
                document.documentElement.style.setProperty(
                  '--accent',
                  (updated && updated.accent) || defaultSettings.accent
                );
                alert('Settings saved.');
              } catch (e) {
                console.error('Save settings error:', e);
                alert('Error saving settings.');
              }
            }}
          >
            Save Settings
          </button>
        </div>
      )}

      {/* Back to Store */}
      <button className="cancel-btn" onClick={onBack} style={{ marginTop: 20 }}>
        Back to Store
      </button>
    </div>
  );
};

export default AdminPanel;
