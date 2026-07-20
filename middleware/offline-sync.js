const crypto = require('crypto');
const db = require('../db/connection');

function uuid() { return crypto.randomUUID(); }

function syncHandler(req, res) {
  try {
    const { farmerId, actions } = req.body;
    if (!farmerId || !Array.isArray(actions)) {
      return res.status(400).json({ error: 'farmerId and actions array required' });
    }

    const results = [];
    for (const action of actions) {
      if (action.type === 'scan') {
        db.prepare(`INSERT INTO scan_logs (id, batch_id, farmer_id, phone, location, result) VALUES (?,?,?,?,?,?)`).run(
          uuid(), action.batchId, farmerId, action.phone || null, action.location || null, action.result || 'authentic'
        );
        results.push({ action: 'scan', status: 'synced' });
      } else if (action.type === 'complaint') {
        const batch = db.prepare(`SELECT id, supplier_id FROM batches WHERE qr_code = ?`).get(action.qrCode);
        if (batch) {
          db.prepare(`INSERT INTO complaints (id, batch_id, farmer_id, phone, description, routed_to) VALUES (?,?,?,?,?,?)`).run(
            uuid(), batch.id, farmerId, action.phone || null, action.description || 'Offline complaint', batch.supplier_id
          );
          results.push({ action: 'complaint', status: 'synced' });
        } else {
          results.push({ action: 'complaint', status: 'skipped', reason: 'batch_not_found' });
        }
      }
      db.prepare(`UPDATE offline_sync_queue SET synced = 1 WHERE farmer_id = ? AND action = ? AND synced = 0`).run(farmerId, action.type);
    }

    res.json({ synced: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { syncHandler };
