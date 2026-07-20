require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const dealerRoutes = require('./routes/dealers');
const farmerRoutes = require('./routes/farmers');
const supplierRoutes = require('./routes/suppliers');
const supplierDashRoutes = require('./routes/supplier');
const adminRoutes = require('./routes/admin');
const verificationRoutes = require('./routes/verification');
const complaintRoutes = require('./routes/complaints');
const advisoryRoutes = require('./routes/advisory');
const { syncHandler } = require('./middleware/offline-sync');
const smsRoutes = require('./routes/sms');
const traceRoutes = require('./routes/trace');
const { rateLimit } = require('./middleware/rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: 'FieldFlow API', port: PORT });
});

app.use('/auth', authRoutes);
app.use('/batches', batchRoutes);
app.use('/dealers', dealerRoutes);
app.use('/farmers', farmerRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/supplier', supplierDashRoutes);
app.use('/admin', adminRoutes);
app.use('/verify', verificationRoutes);
app.use('/complaints', complaintRoutes);
app.use('/advisory', advisoryRoutes);
app.use('/sms', smsRoutes);
app.use('/trace', traceRoutes);
app.post('/sync', syncHandler);
app.get('/ratelimit/status', (req, res) => {
  const { getRateLimitStatus } = require('./middleware/rate-limit');
  const phone = req.query.phone || 'unknown';
  res.json(getRateLimitStatus(phone));
});

app.get('/verify-page', (req, res) => {
  res.render('verify');
});

app.get('/dashboard', (req, res) => {
  res.render('dealer', { title: 'Dealer Portal' });
});

app.get('/farmer-portal', (req, res) => {
  res.render('farmer', { title: 'Farmer Portal' });
});

app.get('/supplier-portal', (req, res) => {
  res.render('supplier', { title: 'Supplier Portal' });
});

app.get('/admin-portal', (req, res) => {
  res.render('admin', { title: 'Admin Portal' });
});

app.get('/health', (req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    res.send(`<!DOCTYPE html><html><head><title>Health - FieldFlow</title><style>body{font-family:sans-serif;background:#0f2a1d;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh}.card{background:#1a3a2b;padding:40px;border-radius:16px;text-align:center}h1{color:#4caf50}.ok{color:#4caf50;font-size:2em}.ts{color:#a0c0b0;margin-top:12px}</style></head><body><div class="card"><h1>FieldFlow</h1><div class="ok">&#10003; OK</div><div class="ts">${new Date().toISOString()}</div></div></body></html>`);
  } else {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
});

app.listen(PORT, () => {
  console.log(`[fieldflow] listening on :${PORT}`);
});
