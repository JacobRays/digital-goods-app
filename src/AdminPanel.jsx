// src/AdminPanel.jsx
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

  // ... keep your other functions: addNewBatch, removeBatch, saveSettings, etc.

  return (
    <div className="admin-panel">
      {/* your original layout remains intact */}
      {/* Batches / Categories / Settings rendering goes here, unchanged */}
      {/* Just ensure your upload button calls handleFileUpload, and category form calls addNewCategory */}
    </div>
  );
};

export default AdminPanel;
