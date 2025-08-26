import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();  // Initialize app first

// THEN add middleware
app.use(cors());
app.use(express.json());

// Debug middleware - ADD THIS AFTER app is initialized
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Initialize Telegram Bot - AFTER app initialization
const botToken = process.env.TELEGRAM_BOT_TOKEN || '8293938224:AAGGowxpHe6LEdOfraN2isM7Y-vDGb7_--4';
const bot = new TelegramBot(botToken, { polling: false });

// Test endpoints - ADD THESE
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Server is running!', 
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/crypto-payments',
      '/api/admin/payments'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: '✅ Healthy', 
    serverTime: new Date().toISOString(),
    port: process.env.PORT || 3002
  });
});

// Your existing data storage
let payments = [];
let purchases = [];

// Load existing data if available
try {
  const data = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
  const parsed = JSON.parse(data);
  payments = parsed.payments || [];
  purchases = parsed.purchases || [];
} catch (error) {
  console.log('Starting with empty data');
}

// Save data to file
function saveData() {
  const data = JSON.stringify({ payments, purchases }, null, 2);
  fs.writeFileSync(path.join(__dirname, 'data.json'), data);
}

// SIMPLIFIED: Remove Stars endpoint since you don't have business account
app.post('/api/create-stars-invoice', async (req, res) => {
  res.json({
    success: false,
    fallback: true,
    message: 'Telegram Stars requires business account. Please use PayPal or Crypto.',
    availableMethods: ['paypal', 'crypto']
  });
});

// Keep your working crypto payment system
app.post('/api/crypto-payments', (req, res) => {
  try {
    const payment = {
      id: Date.now().toString(),
      ...req.body,
      status: 'pending',
      type: 'crypto',
      createdAt: new Date().toISOString()
    };
    
    payments.push(payment);
    saveData();
    
    res.json({
      success: true,
      payment,
      message: 'Crypto payment recorded. Awaiting manual approval.'
    });
    
  } catch (error) {
    console.error('Crypto payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ADD THIS GET ENDPOINT FOR TESTING
app.get('/api/crypto-payments', (req, res) => {
  res.json({
    message: '✅ Crypto payments API is working!',
    totalPayments: payments.length,
    payments: payments,
    status: 'success'
  });
});

// Admin endpoints for crypto approval
app.get('/api/admin/payments', (req, res) => {
  const pendingPayments = payments.filter(p => p.status === 'pending' && p.type === 'crypto');
  res.json({
    message: '✅ Admin payments API is working!',
    pendingPayments: pendingPayments,
    totalPending: pendingPayments.length
  });
});

app.patch('/api/admin/approve-payment/:id', (req, res) => {
  try {
    const payment = payments.find(p => p.id === req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    if (payment.type !== 'crypto') {
      return res.status(400).json({ error: 'Only crypto payments can be manually approved' });
    }
    
    payment.status = 'approved';
    payment.approvedAt = new Date().toISOString();
    payment.approvedBy = 'admin';
    
    // Grant access to user
    const purchase = {
      id: Date.now().toString(),
      userId: payment.userId,
      product: payment.product,
      date: new Date().toISOString(),
      status: 'completed',
      files: payment.product.files || [],
      paymentMethod: 'crypto'
    };
    
    purchases.push(purchase);
    saveData();
    
    res.json({ 
      success: true, 
      message: 'Payment approved! User now has access to files.',
      payment 
    });
    
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User purchases endpoint
app.get('/api/purchases/:userId', (req, res) => {
  const userPurchases = purchases.filter(p => p.userId === req.params.userId);
  res.json(userPurchases);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test URLs:`);
  console.log(`http://localhost:${PORT}/`);
  console.log(`http://localhost:${PORT}/health`);
  console.log(`http://localhost:${PORT}/api/crypto-payments`);
  console.log(`Crypto payment system ready - Manual approval required`);
  console.log(`PayPal.me payments handled client-side`);
});