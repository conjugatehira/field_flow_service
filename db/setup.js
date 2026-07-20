const db = require('./connection');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'dealer', 'supplier', 'farmer')),
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    upazila TEXT,
    crop_type TEXT,
    soil_type TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dealers (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_no TEXT UNIQUE NOT NULL,
    business_name TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id),
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('fertilizer', 'pesticide', 'seed')),
    dealer_id TEXT NOT NULL REFERENCES dealers(id),
    supplier_id TEXT REFERENCES suppliers(id),
    qr_code TEXT UNIQUE NOT NULL,
    qr_signature TEXT NOT NULL,
    mfg_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'flagged', 'recalled')),
    supplier_batch_origin_id TEXT REFERENCES supplier_batch_origins(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scan_logs (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    farmer_id TEXT REFERENCES users(id),
    phone TEXT,
    location TEXT,
    result TEXT NOT NULL CHECK (result IN ('authentic', 'already_used', 'counterfeit')),
    scanned_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    farmer_id TEXT REFERENCES users(id),
    phone TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'filed' CHECK (status IN ('filed', 'under_review', 'resolved', 'dismissed', 'escalated')),
    routed_to TEXT REFERENCES suppliers(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS advisories (
    id TEXT PRIMARY KEY,
    crop_type TEXT NOT NULL,
    soil_type TEXT,
    upazila TEXT,
    condition_rule TEXT DEFAULT 'normal' CHECK (condition_rule IN ('dry', 'rainy', 'hot', 'cold', 'normal')),
    message_template TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS advisory_logs (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES users(id),
    advisory_id TEXT REFERENCES advisories(id),
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'app')),
    sent_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplier_batch_origins (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('fertilizer', 'pesticide', 'seed')),
    batch_number TEXT,
    mfg_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'expired')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved')),
    finding TEXT CHECK (finding IN ('genuine_resold', 'dealer_diversion', 'counterfeit', 'not_ours')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_batches_qr ON batches(qr_code);
  CREATE INDEX IF NOT EXISTS idx_scan_logs_batch ON scan_logs(batch_id);
  CREATE TABLE IF NOT EXISTS trace_events (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('batch_created','scanned','complaint_filed','status_changed','recalled')),
    actor_id TEXT REFERENCES users(id),
    actor_role TEXT,
    metadata TEXT,
    previous_hash TEXT,
    hash TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sms_messages (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message TEXT NOT NULL,
    keyword TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'processed')),
    reference_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_trace_batch ON trace_events(batch_id);
  CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_messages(phone);
  CREATE INDEX IF NOT EXISTS idx_complaints_batch ON complaints(batch_id);
`);

try { db.exec(`ALTER TABLE suppliers ADD COLUMN user_id TEXT UNIQUE REFERENCES users(id)`); } catch(e) {}
try { db.exec(`ALTER TABLE trace_events ADD COLUMN previous_hash TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE trace_events ADD COLUMN hash TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE batches ADD COLUMN supplier_batch_origin_id TEXT REFERENCES supplier_batch_origins(id)`); } catch(e) {}

console.log('[setup] Database tables created');
