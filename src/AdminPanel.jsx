import React, { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://digital-goods-app-tqac.onrender.com';

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
      const resp = await fetch(`${API_BASE}/api/upload`, { 
        method: 'POST', 
        body: form 
      });
      
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || 'File upload failed.');
        return;
      }
      
      const result = await resp.json();
      setNewBatch((prev) => ({
        ...prev,
        files: [...prev.files, ...(result.files || [])],
      }));
      alert('Files uploaded successfully!');
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
      setProducts((prev) => prev.filter((p) => p._id !== id));
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
      setPurchases((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
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
      setPurchases((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
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
      const resp = await fetch(`${API_BASE}/api/upload`, { 
        method: 'POST', 
        body: form 
      });
      
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
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
      alert('Category updated successfully!');
    } catch (e) {
      console.error('Update category error:', e);
      alert('Error updating category.');
    }
  };

  const removeCategory = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/api/categories/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
        alert('Category deleted successfully!');
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
              onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
              placeholder="e.g., Business Plan Template"
            />
          </div>
          <div className="form-group">
            <label>Price ($)</label>
            <input
              type="number"
              value={newBatch.price}
              onChange={(e) => setNewBatch({ ...newBatch, price: e.target.value })}
              placeholder="e.g., 19.99"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newBatch.description}
              onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
              placeholder="Product description..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={newBatch.category}
              onChange={(e) => setNewBatch({ ...newBatch, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Thumbnail Emoji</label>
            <input
              value={newBatch.thumbnail}
              onChange={(e) => setNewBatch({ ...newBatch, thumbnail: e.target.value })}
              placeholder="e.g., 📦"
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
              onChange={(e) => setNewBatch({ ...newBatch, rating: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Files</label>
            <input
              type="file"
              multiple
              onChange={handleFilesUpload}
            />
            <div className="file-list">
              {newBatch.files.map((file, idx) => (
                <div key={idx} className="file-item">
                  <span>{file.name || file.originalName}</span>
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
                onChange={(e) => setNewBatch({ ...newBatch, onSale: e.target.checked })}
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
                onChange={(e) => setNewBatch({ ...newBatch, salePercent: e.target.value })}
                placeholder="e.g., 20"
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
                {products.map((product) => (
                  <div key={product._id} className="admin-product-card">
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
                      <button
                        className="delete-btn"
                        onClick={() => removeBatch(product._id)}
                      >
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
                      uploadIcon(e, (url) =>
                        setEditingCategory({ ...editingCategory, customIcon: url })
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
                    setEditingCategory({ ...editingCategory, color: e.target.value })
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
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, color: e.target.value })
                  }
                  style={{ height: 40 }}
                />
              </div>

              <button
                type="button"
                className="submit-btn"
                onClick={addNewCategory}
              >
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
                  <div key={category._id} className="admin-product-card">
                    <div className="product-header">
                      <div
                        className="product-thumbnail"
                        style={{
                          backgroundColor: category.color,
                          borderRadius: 10,
                        }}
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
                      <button
                        className="delete-btn"
                        onClick={() => removeCategory(category._id)}
                      >
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

      {/* SETTINGS TAB - RESTORED AND WORKING */}
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
                  onChange={(e) =>
                    setSettings({ ...settings, appTitle: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>App Subtitle</label>
                <input
                  value={settings.appSubtitle || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, appSubtitle: e.target.value })
                  }
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
                    setSettings({
                      ...settings,
                      wallets: { ...settings.wallets, btc: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>ETH Wallet Address</label>
                <input
                  value={settings.wallets?.eth || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      wallets: { ...settings.wallets, eth: e.target.value },
                    })
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
                      wallets: {
                        ...settings.wallets,
                        usdt_trc20: e.target.value,
                      },
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
                  onChange={(e) =>
                    setSettings({ ...settings, accent: e.target.value })
                  }
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
                setSettings(updated);
                document.documentElement.style.setProperty(
                  '--accent',
                  updated.accent || '#F0B90B'
                );
                alert('Settings saved successfully!');
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
      <button
        className="cancel-btn"
        onClick={onBack}
        style={{ marginTop: 20 }}
      >
        Back to Store
      </button>
    </div>
  );
};

export default AdminPanel;
