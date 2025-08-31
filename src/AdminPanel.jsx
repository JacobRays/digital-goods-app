import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import fs from 'fs';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

const app = express();
const basePort = process.env.PORT || 3002;

// --- Enhanced CORS configuration ---
// Allow requests from your Vercel frontend and local development
app.use(cors({ 
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173',
    'https://*.vercel.app',
    'https://*.onrender.com'
  ], 
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// --- Ensure uploads folder exists ---
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// --- HTTP + WebSocket Setup ---
// Moved up so io is available to all routes
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { 
    origin: [
      'http://localhost:3000', 
      'http://localhost:5173',
      'https://*.vercel.app',
      'https://*.onrender.com'
    ], 
    methods: ['GET', 'POST', 'PATCH', 'DELETE'] 
  }
});

// --- MongoDB Connection ---
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

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
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Create initial data if collections are empty
    await initializeData();
    
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

// Initialize with sample data if collections are empty
async function initializeData() {
  try {
    // Check if categories collection is empty
    const categoryCount = await categoriesCollection.countDocuments();
    if (categoryCount === 0) {
      const defaultCategories = [
        { _id: new ObjectId(), name: 'Business leads', icon: '📊', color: '#3B82F6' },
        { _id: new ObjectId(), name: 'Crypto', icon: '💰', color: '#F59E0B' },
        { _id: new ObjectId(), name: 'Courses', icon: '📚', color: '#EF4444' },
        { _id: new ObjectId(), name: 'Software', icon: '⚙️', color: '#10B981' },
        { _id: new ObjectId(), name: 'Design', icon: '🎨', color: '#8B5CF6' },
        { _id: new ObjectId(), name: 'Lifestyle', icon: '🌿', color: '#EC4899' }
      ];
      await categoriesCollection.insertMany(defaultCategories);
      console.log('✅ Added default categories');
    }

    // Check if products collection is empty
    const productCount = await productsCollection.countDocuments();
    if (productCount === 0) {
      const defaultProducts = [
        {
          _id: new ObjectId(),
          name: 'Sample Product 1',
          price: 19.99,
          description: 'A great starter product',
          category: 'Business leads',
          thumbnail: '📦',
          rating: 4.5,
          files: [],
          onSale: false,
          salePercent: 0
        },
        {
          _id: new ObjectId(),
          name: 'Sample Product 2',
          price: 29.99,
          description: 'Another amazing product',
          category: 'Crypto',
          thumbnail: '📦',
          rating: 4.2,
          files: [],
          onSale: true,
          salePercent: 15
        }
      ];
      await productsCollection.insertMany(defaultProducts);
      console.log('✅ Added default products');
    }

    // Check if settings exist
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
      console.log('✅ Added default settings');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

connectToDatabase();

// --- Socket.io connection handling ---
io.on('connection', (socket) => {
  console.log('✅ WebSocket client connected');
  socket.on('disconnect', () => console.log('❌ WebSocket client disconnected'));
});

// --- Example test route ---
app.get('/', (req, res) => {
  res.send('🚀 Server is running with MongoDB!');
});

// --- Health check endpoint ---
app.get('/api/health', async (req, res) => {
  try {
    // Check if MongoDB is connected
    await db.command({ ping: 1 });
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// --- File Upload Setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/api/upload', upload.array('files'), (req, res) => {
  try {
    const files = (req.files || []).map(f => ({
      url: `/uploads/${f.filename}`,
      name: f.originalname
    }));
    res.json({ files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// --- Settings Routes ---
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await settingsCollection.findOne({});
    res.json(settings || {});
  } catch (error) {
    console.error('Settings fetch error:', error);
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
    console.error('Settings update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Category Routes ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await categoriesCollection.find({}).toArray();
    res.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, icon = '📦', color = '#6B7280' } = req.body || {};
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
    console.error('Category creation error:', error);
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
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = await categoriesCollection.findOne({ _id: new ObjectId(id) });
    io.emit('category-updated', updatedCategory);
    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoriesCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    io.emit('category-deleted', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Category deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await productsCollection.find({}).toArray();
    res.json(products);
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = { 
      _id: new ObjectId(), 
      ...req.body,
      createdAt: new Date()
    };
    
    await productsCollection.insertOne(product);
    io.emit('product-added', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await productsCollection.findOne({ _id: new ObjectId(id) });
    io.emit('product-updated', updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    io.emit('product-deleted', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Banner Routes ---
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await bannersCollection.find({}).toArray();
    res.json(banners);
  } catch (error) {
    console.error('Banners fetch error:', error);
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
    console.error('Banner creation error:', error);
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
      return res.status(404).json({ error: 'Banner not found' });
    }

    const updatedBanner = await bannersCollection.findOne({ _id: new ObjectId(id) });
    io.emit('banner-updated', updatedBanner);
    res.json(updatedBanner);
  } catch (error) {
    console.error('Banner update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bannersCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    io.emit('banner-deleted', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Banner deletion error:', error);
    res.status(500).json({ error: error.message });
  }
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
    console.error('Purchases fetch error:', error);
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
    console.error('Purchase creation error:', error);
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
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const updatedPurchase = await purchasesCollection.findOne({ _id: new ObjectId(id) });
    io.emit('purchase-updated', updatedPurchase);
    res.json(updatedPurchase);
  } catch (error) {
    console.error('Purchase update error:', error);
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
