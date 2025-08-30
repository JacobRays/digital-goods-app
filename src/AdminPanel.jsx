// src/AdminPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';
import { io } from 'socket.io-client';

const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

const AdminPanel = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('batches');
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
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
      setPurchases((prev) => prev.map((x) => (x.id === p.id ? p : x)));
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
        setSettings(sets || {});
        setPurchases([...(pending || []), ...(approved || [])]);

        if (!newBatch.category && (cats || [])[0]) {
          setNewBatch((p) => ({ ...p, category: cats[0].name }));
        }
        document.documentElement.style.setProperty('--accent', (sets && sets.accent) || '#F0B90B');
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingPayments = purchases.filter(
    (p) => p.status === 'pending' && p.paymentMethod === 'crypto'
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
        console.error('Upload failed:', err);
        alert(err.error || 'File upload failed.');
        return;
      }
      const result = await resp.json();
      setNewBatch((prev) => ({ ...prev, files: [...prev.files, ...(result.files || [])] }));
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading files.');
    }
  };

  const removeFile = (idx) => {
    setNewBatch((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));
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
        console.error('Add batch failed:', err);
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

  const removeBatch = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const resp = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'Delete failed.');
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
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
      const resp = await fetch(`${API_BASE}/api/products/${product.id}`, {
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
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      console.error('Toggle sale error:', e);
      alert('Error updating sale status.');
    }
  };

  // ---- Payments Approvals ----
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
      setPurchases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
      setPurchases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
        console.error('Icon upload failed:', err);
        alert(err.error || 'Icon upload failed.');
        return;
      }
      const result = await resp.json();
      const iconUrl = result.files?.[0]?.url || null;
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
        console.error('Category add failed:', err);
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
    try {
      const body = { ...editingCategory };
      const resp = await fetch(`${API_BASE}/api/categories/${editingCategory.id}`, {
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
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCategory(null);
    } catch (e) {
      console.error('Update category error:', e);
      alert('Error updating category.');
    }
  };

  const removeCategory = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/api/categories/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        const e = await resp.json().catch(() => ({}));
        alert(e.error || 'Cannot remove category.');
      }
    } catch (e) {
      console.error('Remove category error:', e);
      alert('Error removing category.');
    }
  };

  // ---- Settings ----
  const saveSettings = async () => {
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
      setSettings(updated);
      document.documentElement.style.setProperty('--accent', updated.accent || '#F0B90B');
      alert('Settings saved.');
    } catch (e) {
      console.error('Save settings error:', e);
      alert('Error saving settings.');
    }
  };

  const thumbnailOptions = [
    '📊',
    '💰',
    '📚',
    '⚙️',
    '🎨',
    '🌿',
    '⚖️',
    '🏠',
    '👔',
    '💻',
    '📱',
    '🔍',
  ];

  // ensure you have: import { io } from 'socket.io-client';

const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    setCategories(await res.json());
  } catch (e) {
    console.error('Category fetch failed', e);
  }
};

const handleAddCategory = async () => {
  const name = newCategory.trim();
  if (!name) return;
  try {
    const res = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await fetchCategories();   // instant refresh
      setNewCategory('');
    } else {
      console.error('Add category failed', data.error);
    }
  } catch (e) {
    console.error('Add category failed', e);
  }
};

useEffect(() => {
  fetchCategories();

  const socket = io(API_BASE);
  socket.on('category-added', fetchCategories);
  socket.on('category-updated', fetchCategories);
  socket.on('category-deleted', fetchCategories);
const [banners, setBanners] = useState([]);
const [newBanner, setNewBanner] = useState({
  image: '',
  link: '',
  order: banners.length + 1,
});

useEffect(() => {
  fetch(`${API_BASE}/api/banners`)
    .then(r => r.json())
    .then(data => setBanners(data || []))
    .catch(err => console.error('Failed to load banners', err));
}, []);

const handleBannerImageUpload = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  try {
    const form = new FormData();
    form.append('files', files[0]);
    const resp = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: form
    });
    if (!resp.ok) throw new Error('Upload failed');
    const result = await resp.json();
    const url = result.files?.[0]?.url || '';
    setNewBanner(prev => ({ ...prev, image: url }));
  } catch (err) {
    console.error(err);
    alert('Image upload failed');
  }
};

const addNewBanner = async () => {
  if (!newBanner.image || !newBanner.link) {
    alert('Image and link are required');
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/api/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBanner)
    });
    if (!resp.ok) throw new Error('Add banner failed');
    const saved = await resp.json();
    setBanners(prev => [...prev, saved]);
    setNewBanner({ image: '', link: '', order: banners.length + 1 });
    alert('Banner added successfully!');
  } catch (err) {
    console.error(err);
    alert('Failed to add banner');
  }
};

const removeBanner = async (id) => {
  if (!window.confirm('Delete this banner?')) return;
  try {
    const resp = await fetch(`${API_BASE}/api/banners/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Delete failed');
    setBanners(prev => prev.filter(b => b.id !== id));
  } catch (err) {
    console.error(err);
    alert('Error deleting banner');
  }
};

  return () => socket.disconnect();
}, []);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <p>Manage products, payments, categories & settings</p>
      </div>
{/* BANNERS */}
{activeTab === 'banners' && (
  <div className="product-form">
    <h3>Add New Banner</h3>

    <div className="form-group">
      <label>Banner Image</label>
      <input type="file" accept="image/*" onChange={handleBannerImageUpload} />
      {newBanner.image && (
        <img src={`${API_BASE}${newBanner.image}`} alt="Preview" style={{ maxWidth: '100%', marginTop: 10, borderRadius: 8 }} />
      )}
    </div>

    <div className="form-group">
      <label>Link URL</label>
      <input
        value={newBanner.link}
        onChange={(e) => setNewBanner(prev => ({ ...prev, link: e.target.value }))}
        placeholder="/sale or full URL"
      />
    </div>

    <div className="form-group">
      <label>Order</label>
      <input
        type="number"
        value={newBanner.order}
        onChange={(e) => setNewBanner(prev => ({ ...prev, order: Number(e.target.value) }))}
      />
    </div>

    <button type="button" className="submit-btn" onClick={addNewBanner}>
      Add Banner
    </button>

    <div className="products-list">
      <h3>Existing Banners ({banners.length})</h3>
      {banners.length === 0 ? (
        <div className="no-products">No banners added yet.</div>
      ) : (
        <div className="products-grid">
          {banners
            .sort((a, b) => a.order - b.order)
            .map((banner) => (
              <div key={banner.id} className="admin-product-card">
                <div className="product-header">
                  <img src={`${API_BASE}${banner.image}`} alt="" style={{ width: '100%', borderRadius: 8 }} />
                </div>
                <p style={{ wordBreak: 'break-all' }}>{banner.link}</p>
                <p>Order: {banner.order}</p>
                <div className="product-actions">
                  <button className="delete-btn" onClick={() => removeBanner(banner.id)}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  </div>
)}

      <div className="form-group">
        <label>Navigation</label>
        <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
          <option value="banners">Manage Banners</option>
          <option value="batches">Manage Batches</option>
          <option value="payments">Payment Approvals</option>
          <option value="categories">Manage Categories</option>
          <option value="settings">Settings</option>
        </select>
      </div>

      <div className="admin-content">
        {/* BATCHES */}
        {activeTab === 'batches' && (
          <div className="product-form">
            <h3>Add New Batch</h3>

            <div className="form-group">
              <label>Batch Name</label>
              <input
                value={newBatch.name}
                onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                placeholder="e.g., Law Firm Leads - Batch 1"
              />
            </div>

            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newBatch.price}
                onChange={(e) => setNewBatch({ ...newBatch, price: e.target.value })}
                placeholder="e.g., 40"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={newBatch.onSale}
                  onChange={(e) => setNewBatch({ ...newBatch, onSale: e.target.checked })}
                />{' '}
                Put on Sale
              </label>
              {newBatch.onSale && (
                <div style={{ marginTop: 10 }}>
                  <label>Sale Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newBatch.salePercent}
                    onChange={(e) => setNewBatch({ ...newBatch, salePercent: e.target.value })}
                  />
                  {newBatch.price && newBatch.salePercent > 0 && (
                    <p style={{ color: '#10B981', marginTop: 5 }}>
                      Sale Price: $
                      {(+newBatch.price * (1 - Number(newBatch.salePercent) / 100)).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Category Dropdown with fallback */}
            <div className="form-group">
              <label>Category</label>
              <select
                value={newBatch.category}
                onChange={(e) => setNewBatch({ ...newBatch, category: e.target.value })}
              >
                <option value="">-- Select Category --</option>
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No categories available</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Thumbnail Emoji</label>
              <div className="thumbnail-grid">
                {thumbnailOptions.map((emoji) => (
                  <div
                    key={emoji}
                    className={`thumbnail-option ${newBatch.thumbnail === emoji ? 'selected' : ''}`}
                    onClick={() => setNewBatch({ ...newBatch, thumbnail: emoji })}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Rating</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={newBatch.rating}
                onChange={(e) => setNewBatch({ ...newBatch, rating: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                rows="3"
                value={newBatch.description}
                onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
                placeholder="Describe this batch..."
              />
            </div>

            {/* Improved File Upload */}
            <div className="form-group">
              <label>Files</label>
              <div className="file-upload-area">
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => document.getElementById('batchFileInput').click()}
                >
                  📂 Upload Files
                </button>
                <input
                  id="batchFileInput"
                  type="file"
                  multiple
                  onChange={handleFilesUpload}
                  style={{ display: 'none' }}
                />
                {newBatch.files.length > 0 && (
                  <div className="file-list">
                    {newBatch.files.map((f, i) => (
                      <div key={i} className="file-item">
                        <span className="file-name">{f.name || f.url?.split('/').pop()}</span>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => removeFile(i)}
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="button" className="submit-btn" onClick={addNewBatch}>
              Add Batch
            </button>

            <div className="products-list">
              <h3>Existing Batches ({products.length})</h3>
              {products.length === 0 ? (
                <div className="no-products">
                  <p>No batches added yet.</p>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map((product) => (
                    <div key={product.id} className="admin-product-card">
                      <div className="product-header">
                        <div className="product-thumbnail">{product.thumbnail}</div>
                        <div className="product-info">
                          <h4>{product.name}</h4>
                          <div className="product-price">
                            {product.onSale ? (
                              <>
                                <span
                                  style={{
                                    textDecoration: 'line-through',
                                    color: '#ef4444',
                                    marginRight: 8,
                                  }}
                                >
                                  ${product.originalPrice}
                                </span>
                                <span>${product.price}</span>
                                <span className="sale-badge" style={{ marginLeft: 8 }}>
                                  -{product.salePercent}%
                                </span>
                              </>
                            ) : (
                              <>${product.price}</>
                            )}
                          </div>
                          <span className="product-category">{product.category}</span>
                        </div>
                      </div>
                      <p className="product-description">{product.description}</p>
                      <div className="product-actions">
                        <button
                          className={product.onSale ? 'edit-btn' : 'submit-btn'}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => toggleSale(product)}
                        >
                          {product.onSale ? 'Remove Sale' : 'Put on Sale'}
                        </button>
                        <button className="delete-btn" onClick={() => removeBatch(product.id)}>
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

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="product-form">
            <h3>Pending Payment Approvals ({pendingPayments.length})</h3>
            {pendingPayments.length === 0 ? (
              <div className="no-products">No pending payments requiring approval.</div>
            ) : (
              <div className="payments-list">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="payment-item">
                    <div className="payment-info">
                      <h4>{p.productName}</h4>
                      <p>
                        User: <span className="mono">{p.userId}</span>
                      </p>
                      <p>
                        Amount: ${p.amount} ({p.currency})
                      </p>
                      {p.txHash && (
                        <p>
                          Tx: <span className="mono">{p.txHash}</span>
                        </p>
                      )}
                      <span className={`status ${p.status}`}>{p.status}</span>
                    </div>
                    <div className="payment-actions">
                      <button className="approve-btn" onClick={() => approvePayment(p.id)}>
                        Approve
                      </button>
                      <button className="reject-btn" onClick={() => rejectPayment(p.id)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ marginTop: 30 }}>Approved Purchases</h3>
            <div className="payments-list">
              {purchases.filter((p) => p.status === 'completed').length === 0 ? (
                <div className="no-payments">No approved purchases yet.</div>
              ) : (
                purchases
                  .filter((p) => p.status === 'completed')
                  .map((purchase) => (
                    <div key={purchase.id} className="payment-item">
                      <div className="payment-info">
                        <h4>{purchase.productName}</h4>
                        <p>
                          User: <span className="mono">{purchase.userId}</span>
                        </p>
                        <p>
                          Status: <span className="status approved">Approved</span>
                        </p>
                      </div>
                      <div className="payment-actions">
                        {purchase.files?.map((file, idx) => (
                          <a
                            key={idx}
                            className="approve-btn"
                            href={`${API_BASE}${file.url}`}
                            download={file.name}
                          >
                            Download {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* CATEGORIES */}
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
                      setEditingCategory({ ...editingCategory, name: e.target.value })
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
                            setEditingCategory({ ...editingCategory, icon: emoji })
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
                        uploadIcon(e, (url) => setEditingCategory({ ...editingCategory, customIcon: url }))
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
                      setEditingCategory({ ...editingCategory, color: e.target.value })
                    }
                    style={{ height: 40 }}
                  />
                </div>

                <button type="button" className="submit-btn" onClick={updateCategory}>
                  Save Changes
                </button>
                <button type="button" className="cancel-btn" onClick={() => setEditingCategory(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Real Estate"
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
                          onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
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
                          const url = result.files?.[0]?.url || null;
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
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
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
                  {categories.map((category) => (
                    <div key={category.id} className="admin-product-card">
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
                          <div style={{ color: category.color, fontSize: 12 }}>{category.color}</div>
                        </div>
                      </div>
                      <div className="product-actions">
                        <button className="edit-btn" onClick={() => setEditingCategory({ ...category })}>
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => removeCategory(category.id)}>
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

        {/* SETTINGS */}
        {activeTab === 'settings' && settings && (
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
                    onChange={(e) => setSettings({ ...settings, appTitle: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>App Subtitle</label>
                  <input
                    value={settings.appSubtitle || ''}
                    onChange={(e) => setSettings({ ...settings, appSubtitle: e.target.value })}
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
                      setSettings({ ...settings, wallets: { ...settings.wallets, btc: e.target.value } })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>ETH Wallet Address</label>
                  <input
                    value={settings.wallets?.eth || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, wallets: { ...settings.wallets, eth: e.target.value } })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>USDT (TRC20) Wallet Address</label>
                  <input
                    value={settings.wallets?.usdt_trc20 || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        wallets: { ...settings.wallets, usdt_trc20: e.target.value },
                      })
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
                    value={settings.accent || '#F0B90B'}
                    onChange={(e) => setSettings({ ...settings, accent: e.target.value })}
                    style={{ height: 40 }}
                  />
                </div>
              </>
            )}

            <button type="button" className="submit-btn" onClick={saveSettings}>
              Save Settings
            </button>
          </div>
        )}
      </div>

      <button className="cancel-btn" onClick={onBack} style={{ marginTop: 20 }}>
        Back to Store
      </button>
    </div>
  );
};

export default AdminPanel;
