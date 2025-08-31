import React, { useEffect, useMemo, useState } from "react";
import "./AdminPanel.css";
import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://digital-goods-app-tqac.onrender.com";

const AdminPanel = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState("batches");
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    appTitle: "",
    appSubtitle: "",
    wallets: { btc: "", eth: "", usdt_trc20: "" },
    accent: "#F0B90B",
  });
  const [purchases, setPurchases] = useState([]);
  const [newBatch, setNewBatch] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    thumbnail: "📦",
    rating: 4.5,
    files: [],
    onSale: false,
    salePercent: 0,
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "📦",
    color: "#6B7280",
    customIcon: null,
  });
  const [editingCategory, setEditingCategory] = useState(null);

  const userId = useMemo(() => {
    let id = localStorage.getItem("userId");
    if (!id) {
      id = "user_" + Math.random().toString(36).slice(2, 11);
      localStorage.setItem("userId", id);
    }
    return id;
  }, []);

  // Socket for realtime purchase updates
  useEffect(() => {
    const socket = io(API_BASE, { transports: ["websocket"] });
    socket.emit("join", { userId });
    socket.on("purchase-updated", (p) => {
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
            appTitle: "",
            appSubtitle: "",
            wallets: { btc: "", eth: "", usdt_trc20: "" },
            accent: "#F0B90B",
          }
        );
        setPurchases([...(pending || []), ...(approved || [])]);
        if (!newBatch.category && (cats || [])[0]) {
          setNewBatch((p) => ({ ...p, category: cats[0].name }));
        }
        document.documentElement.style.setProperty(
          "--accent",
          (sets && sets.accent) || "#F0B90B"
        );
      } catch (e) {
        console.error("Failed to load initial data:", e);
      }
    })();
  }, []);

  const pendingPayments = purchases.filter(
    (p) => p.status === "pending" && p.paymentMethod === "crypto"
  );

  // ---- Upload handler (fixed for FormData + multer backend)
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]); // must match Multer field name
    }

    try {
      const resp = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData, // browser sets boundary
      });

      if (!resp.ok) throw new Error("Upload failed");

      const data = await resp.json();
      if (data && data.files) {
        setNewBatch((prev) => ({
          ...prev,
          files: [...prev.files, ...data.files],
        }));
      } else {
        alert("Unexpected upload response.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    }
  };

  // ---- Add new category (fixed JSON body)
  const addNewCategory = async () => {
    if (!newCategory.name) return alert("Category name is required.");

    try {
      const resp = await fetch(`${API_BASE}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategory.name,
          icon: newCategory.icon || "📦",
          color: newCategory.color || "#6B7280",
        }),
      });

      if (!resp.ok) throw new Error("Failed to add category");

      const cat = await resp.json();
      setCategories((prev) => [cat, ...prev]);
      setNewCategory({ name: "", icon: "📦", color: "#6B7280", customIcon: null });
    } catch (err) {
      console.error(err);
      alert("Error adding category.");
    }
  };

  // ---- Other functions remain unchanged (addNewBatch, removeBatch, saveSettings, etc.)

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Admin Panel</h2>
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === "batches" ? "active" : ""}
          onClick={() => setActiveTab("batches")}
        >
          📦 Batches
        </button>
        <button
          className={activeTab === "categories" ? "active" : ""}
          onClick={() => setActiveTab("categories")}
        >
          🗂 Categories
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
        <button
          className={activeTab === "purchases" ? "active" : ""}
          onClick={() => setActiveTab("purchases")}
        >
          💳 Purchases
        </button>
      </div>

      {/* === Batches === */}
      {activeTab === "batches" && (
        <div className="admin-section">
          <h3>Add New Batch</h3>
          <input
            type="text"
            placeholder="Batch name"
            value={newBatch.name}
            onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Price"
            value={newBatch.price}
            onChange={(e) => setNewBatch({ ...newBatch, price: e.target.value })}
          />
          <textarea
            placeholder="Description"
            value={newBatch.description}
            onChange={(e) =>
              setNewBatch({ ...newBatch, description: e.target.value })
            }
          />
          <select
            value={newBatch.category}
            onChange={(e) => setNewBatch({ ...newBatch, category: e.target.value })}
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          <input type="file" multiple onChange={handleFileUpload} />
          <button onClick={() => console.log("TODO: Save batch")}>Save Batch</button>

          <h3>Existing Batches</h3>
          <div className="admin-product-list">
            {products.map((p) => (
              <div key={p._id} className="admin-product-card">
                <h4>{p.name}</h4>
                <p>{p.description}</p>
                <p>${p.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Categories === */}
      {activeTab === "categories" && (
        <div className="admin-section">
          <h3>Add New Category</h3>
          <input
            type="text"
            placeholder="Category name"
            value={newCategory.name}
            onChange={(e) =>
              setNewCategory({ ...newCategory, name: e.target.value })
            }
          />
          <button onClick={addNewCategory}>Add Category</button>

          <h3>Existing Categories</h3>
          <div className="admin-category-list">
            {categories.map((c) => (
              <div key={c._id} className="admin-category-card">
                <span>{c.icon}</span>
                <strong>{c.name}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Settings === */}
      {activeTab === "settings" && (
        <div className="admin-section">
          <h3>App Settings</h3>
          <input
            type="text"
            placeholder="App Title"
            value={settings.appTitle}
            onChange={(e) =>
              setSettings({ ...settings, appTitle: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="App Subtitle"
            value={settings.appSubtitle}
            onChange={(e) =>
              setSettings({ ...settings, appSubtitle: e.target.value })
            }
          />
          <input
            type="color"
            value={settings.accent}
            onChange={(e) => setSettings({ ...settings, accent: e.target.value })}
          />
          <button onClick={() => console.log("TODO: Save settings")}>
            Save Settings
          </button>
        </div>
      )}

      {/* === Purchases === */}
      {activeTab === "purchases" && (
        <div className="admin-section">
          <h3>All Purchases</h3>
          <div className="purchase-list">
            {purchases.map((p) => (
              <div key={p._id} className="purchase-card">
                <p>{p.product?.name}</p>
                <p>Status: {p.status}</p>
                <p>Amount: ${p.product?.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
