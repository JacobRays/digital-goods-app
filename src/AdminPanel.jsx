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

  const pendingPayments = purchases.filter(
    (p) => p.status === 'pending' && p.paymentMethod === 'crypto'
  );

  // ... (all your other functions: handleFilesUpload, addNewBatch, removeBatch, etc. unchanged)

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

      {/* ... batches tab code unchanged ... */}
      {/* ... categories tab code unchanged ... */}

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
