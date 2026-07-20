CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dealer', 'supplier', 'farmer')),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  upazila VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_no VARCHAR(50) UNIQUE NOT NULL,
  business_name VARCHAR(200)
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  contact VARCHAR(20),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name VARCHAR(200) NOT NULL,
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('fertilizer', 'pesticide', 'seed')),
  dealer_id UUID NOT NULL REFERENCES dealers(id),
  supplier_id UUID REFERENCES suppliers(id),
  qr_code VARCHAR(64) UNIQUE NOT NULL,
  qr_signature VARCHAR(256) NOT NULL,
  mfg_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id),
  farmer_id UUID REFERENCES users(id),
  phone VARCHAR(20),
  location VARCHAR(200),
  result VARCHAR(20) NOT NULL CHECK (result IN ('authentic', 'already_used', 'counterfeit')),
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id),
  farmer_id UUID REFERENCES users(id),
  phone VARCHAR(20),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'filed' CHECK (status IN ('filed', 'under_review', 'resolved', 'dismissed')),
  routed_to UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE advisories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_type VARCHAR(100) NOT NULL,
  soil_type VARCHAR(100),
  upazila VARCHAR(100),
  condition_rule VARCHAR(50) DEFAULT 'normal' CHECK (condition_rule IN ('dry', 'rainy', 'hot', 'cold', 'normal')),
  message_template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE advisory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES users(id),
  advisory_id UUID REFERENCES advisories(id),
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'app')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_qr ON batches(qr_code);
CREATE INDEX idx_scan_logs_batch ON scan_logs(batch_id);
CREATE INDEX idx_complaints_batch ON complaints(batch_id);
CREATE INDEX idx_offline_sync_farmer ON offline_sync_queue(farmer_id);
