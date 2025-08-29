import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import fs from 'fs';

const app = express();
const basePort = process.env.PORT || 3002;

// --- Middleware ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// --- Ensure uploads folder exists ---
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// --- Example test route ---
app.get('/', (req, res) => {
  res.send('🚀 Server is running!');
});

// --- File Upload Setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/api/upload', upload.array('files'), (req, res) => {
  const files = (req.files || []).map(f => ({
    url: `/uploads/${f.filename}`,
    name: f.originalname
  }));
  res.json({ files });
});

// --- In-memory Data ---
let products = [
  {
    id: 'p1',
    name: 'Sample Product 1',
    price: '$19.99',
    image: '/uploads/sample1.jpg',
    description: 'A great starter product'
  },
  {
    id: 'p2',
    name: 'Sample Product 2',
    price: '$29.99',
    image: '/uploads/sample2.jpg',
    description: 'Another amazing product'
  }
];

let banners = [
  {
    id: 'b1',
    title: 'Welcome to our Marketplace!',
    image: '/uploads/banner1.jpg',
    link: '/products'
  },
  {
    id: 'b2',
    title: 'Hot Deals This Week 🔥',
    image: '/uploads/banner2.jpg',
    link: '/deals'
  }
];

let categories = [
  { id: '1', name: 'Business leads', icon: '📊', color: '#3B82F6' },
  { id: '2', name: 'Crypto',          icon: '💰', color: '#F59E0B' },
  { id: '3', name: 'Courses',         icon: '📚', color: '#EF4444' },
  { id: '4', name: 'Software',        icon: '⚙️', color: '#10B981' },
  { id: '5', name: 'Design',          icon: '🎨', color: '#8B5CF6' },
  { id: '6', name: 'Lifestyle',       icon: '🌿', color: '#EC4899' }
];

let settings = {
  appTitle: 'Digital Marketplace',
  appSubtitle: 'Sell Leads Easily',
  accent: '#F0B90B',
  wallets: {
    btc: process.env.BTC_ADDRESS || '',
    eth: process.env.ETH_ADDRESS || '',
    usdt_trc20: process.env.USDT_ADDRESS || ''
  }
};

// --- Settings Routes ---
app.get('/api/settings', (req, res) => res.json(settings));
app.patch('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  io.emit('settings-updated', settings);
  res.json(settings);
});

// --- Category Routes ---
app.get('/api/categories', (req, res) => res.json(categories));
app.post('/api/categories', (req, res) => {
  const { name, icon = '🗂️', color = '#64748B' } = req.body || {};
  const trimmed = (name || '').trim();
  if (!trimmed) return res.status(400).json({ success: false, error: 'Name required' });

  const exists = categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return res.status(409).json({ success: false, error: 'Category exists' });

  const category = { id: Date.now().toString(), name: trimmed, icon, color };
  categories.push(category);
  io.emit('category-added', category);
  res.status(201).json({ success: true, category });
});
app.patch('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  categories[idx] = { ...categories[idx], ...req.body };
  io.emit('category-updated', categories[idx]);
  res.json({ success: true, category: categories[idx] });
});
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  categories = categories.filter(c => c.id !== id);
  io.emit('category-deleted', id);
  res.json({ success: true });
});

// --- Product Routes ---
app.get('/api/products', (req, res) => res.json(products));
app.post('/api/products', (req, res) => {
  const product = { id: Date.now().toString(), ...req.body };
  products.push(product);
  io.emit('product-added', product);
  res.status(201).json(product);
});
app.patch('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  products[idx] = { ...products[idx], ...req.body };
  io.emit('product-updated', products[idx]);
  res.json(products[idx]);
});
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  products = products.filter(p => p.id !== id);
  io.emit('product-deleted', id);
  res.json({ success: true });
});

// --- Banner Routes ---
app.get('/api/banners', (req, res) => res.json(banners));
app.post('/api/banners', (req, res) => {
  const banner = { id: Date.now().toString(), ...req.body };
  banners.push(banner);
  io.emit('banner-added', banner);
  res.status(201).json(banner);
});
app.patch('/api/banners/:id', (req, res) => {
  const { id } = req.params;
  const idx = banners.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  banners[idx] = { ...banners[idx], ...req.body };
  io.emit('banner-updated', banners[idx]);
  res.json(banners[idx]);
});
app.delete('/api/banners/:id', (req, res) => {
  const { id } = req.params;
  banners = banners.filter(b => b.id !== id);
  io.emit('banner-deleted', id);
  res.json({ success: true });
});

// --- HTTP + WebSocket Setup ---
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});

io.on('connection', (socket) => {
  console.log('✅ WebSocket client connected');
  socket.on('disconnect', () => console.log('❌ WebSocket client disconnected'));
});

// --- Start Server ---
server.listen(basePort, () => {
  const publicURL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${basePort}`;
  console.log(`🚀 API + WebSocket running at ${publicURL}`);
});
