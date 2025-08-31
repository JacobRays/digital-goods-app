import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import fs from 'fs';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

const app = express();
const basePort = process.env.PORT || 3002;

// --- Middleware ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// --- Ensure uploads folder exists ---
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// --- MongoDB Connection ---
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;
let productsCollection, categoriesCollection, bannersCollection, purchasesCollection, settingsCollection;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db();
    productsCollection = db.collection('products');
    categoriesCollection = db.collection('categories');
    bannersCollection = db.collection('banners');
    purchasesCollection = db.collection('purchases');
    settingsCollection = db.collection('settings');
    
    // Create initial settings if they don't exist
    const existingSettings = await settingsCollection.findOne({});
    if (!existingSettings) {
      await settingsCollection.insertOne({
        appTitle: 'Digital Marketplace',
        appSubtitle: 'Sell Leads Easily',
        accent: '#F0B90B',
        wallets: {
          btc: process.env.BTC_ADDRESS || '',
          eth: process.env.ETH_ADDRESS || '',
          usdt_trc20: process.env.USDT_ADDRESS || ''
        }
      });
    }
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

connectToDatabase();

// --- Example test route ---
app.get('/', (req, res) => {
  res.send('🚀 Server is running with MongoDB!');
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

// --- Settings Routes ---
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await settingsCollection.findOne({});
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/settings', async (req, res) => {
  try {
    const result = await settingsCollection.updateOne(
      {},
      { $set: req.body },
      { upsert: true }
    );
    const updatedSettings = await settingsCollection.findOne({});
    io.emit('settings-updated', updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Category Routes ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await categoriesCollection.find({}).toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, icon = '🗂️', color = '#64748B' } = req.body || {};
    const trimmed = (name || '').trim();
    
    if (!trimmed) {
      return res.status(400).json({ success: false, error: 'Name required' });
    }

    const exists = await categoriesCollection.findOne({ 
      name: { $regex: new RegExp(trimmed, 'i') } 
    });
    
    if (exists) {
      return res.status(409).json({ success: false, error: 'Category exists' });
    }

    const category = { 
      _id: new ObjectId(), 
      name: trimmed, 
      icon, 
      color 
    };
    
    await categoriesCollection.insertOne(category);
    io.emit('category-added', category);
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updatedCategory = await categoriesCollection.findOne({ _id: new ObjectId(id) });
    io.emit('category-updated', updatedCategory);
    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoriesCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    io.emit('category-deleted', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await productsCollection.find({}).toArray();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = { 
      _id: new ObjectId(), 
      ...req.body 
    };
    
    await productsCollection.insertOne(product);
    io.emit('product-added', product);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updatedProduct = await productsCollection.findOne({ _id: new ObjectId(id) });
    io.emit('product-updated', updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    io.emit('product-deleted', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Banner Routes ---
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await bannersCollection.find({}).toArray();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/banners', async (req, res) => {
  try {
    const banner = { 
      _id: new ObjectId(), 
      ...req.body 
    };
    
    await bannersCollection.insertOne(banner);
    io.emit('banner-added', banner);
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bannersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updatedBanner = await bannersCollection.findOne({ _id: new ObjectId(id) });
    io.emit('banner-updated', updatedBanner);
    res.json(updatedBanner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bannersCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    io.emit('banner-deleted', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// --- Purchases Route ---
app.get('/api/purchases', async (req, res) => {
  try {
    const { status, userId } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (userId) {
      query.userId = userId;
    }

    const purchases = await purchasesCollection.find(query).toArray();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const purchase = {
      _id: new ObjectId(),
      ...req.body,
      createdAt: new Date()
    };
    
    await purchasesCollection.insertOne(purchase);
    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await purchasesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updatedPurchase = await purchasesCollection.findOne({ _id: new ObjectId(id) });
    io.emit('purchase-updated', updatedPurchase);
    res.json(updatedPurchase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(basePort, () => {
  const publicURL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${basePort}`;
  console.log(`🚀 API + WebSocket running at ${publicURL}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await client.close();
  process.exit(0);
});
