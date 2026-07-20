const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./connection');

function uuid() { return crypto.randomUUID(); }

async function seed() {
  console.log('[seed] Starting...');
  const hash = await bcrypt.hash('admin123', 10);

  if (!db.prepare(`SELECT id FROM users WHERE phone = ?`).get('01700000000')) {
    const id = uuid();
    db.prepare(`INSERT INTO users (id, role, phone, name, upazila, password_hash) VALUES (?,?,?,?,?,?)`).run(id, 'admin', '01700000000', 'Admin User', 'Dhaka', hash);
    console.log('[seed] Admin (01700000000 / admin123)');
  }

  if (!db.prepare(`SELECT id FROM users WHERE phone = ?`).get('01711111111')) {
    const hash2 = await bcrypt.hash('dealer123', 10);
    const userId = uuid();
    db.prepare(`INSERT INTO users (id, role, phone, name, upazila, password_hash) VALUES (?,?,?,?,?,?)`).run(userId, 'dealer', '01711111111', 'Dealer One', 'Gazipur', hash2);
    db.prepare(`INSERT INTO dealers (id, user_id, license_no, business_name) VALUES (?,?,?,?)`).run(uuid(), userId, 'LIC-001', 'Green Agro Supplies');
    console.log('[seed] Dealer (01711111111 / dealer123)');
  }

  if (!db.prepare(`SELECT id FROM users WHERE phone = ?`).get('01722222222')) {
    const hash3 = await bcrypt.hash('farmer123', 10);
    const id = uuid();
    db.prepare(`INSERT INTO users (id, role, phone, name, upazila, crop_type, soil_type, password_hash) VALUES (?,?,?,?,?,?,?,?)`).run(id, 'farmer', '01722222222', 'Farmer Rahim', 'Gazipur', 'rice', 'loamy', hash3);
    console.log('[seed] Farmer (01722222222 / farmer123)');
  }

  if (!db.prepare(`SELECT id FROM users WHERE phone = ?`).get('01733333333')) {
    const hash4 = await bcrypt.hash('supplier123', 10);
    const userId = uuid();
    db.prepare(`INSERT INTO users (id, role, phone, name, upazila, password_hash) VALUES (?,?,?,?,?,?)`).run(userId, 'supplier', '01733333333', 'Bangla Fertilizer Ltd', 'Dhaka', hash4);
    if (!db.prepare(`SELECT id FROM suppliers WHERE name = ?`).get('Bangla Fertilizer Ltd')) {
      db.prepare(`INSERT INTO suppliers (id, user_id, name, contact) VALUES (?,?,?,?)`).run(uuid(), userId, 'Bangla Fertilizer Ltd', '01733333333');
    } else {
      db.prepare(`UPDATE suppliers SET user_id = ? WHERE name = ?`).run(userId, 'Bangla Fertilizer Ltd');
    }
    console.log('[seed] Supplier (01733333333 / supplier123)');
  }

  if (!db.prepare(`SELECT id FROM suppliers WHERE name = ?`).get('CropCare Pesticides')) {
    db.prepare(`INSERT INTO suppliers (id, name, contact) VALUES (?,?,?)`).run(uuid(), 'CropCare Pesticides', '01744444444');
  }

  console.log('[seed] Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});
