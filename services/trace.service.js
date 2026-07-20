const crypto = require('crypto');
const db = require('../db/connection');

function uuid() { return crypto.randomUUID(); }

function appendEvent(batchId, eventType, actorId, actorRole, metadata = {}) {
  const id = uuid();
  const prev = db.prepare(`SELECT hash FROM trace_events WHERE batch_id = ? ORDER BY created_at DESC LIMIT 1`).get(batchId);
  const previousHash = prev ? prev.hash : 'GENESIS';
  const raw = `${id}:${batchId}:${eventType}:${actorId || ''}:${JSON.stringify(metadata)}:${previousHash}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  db.prepare(`INSERT INTO trace_events (id, batch_id, event_type, actor_id, actor_role, metadata, previous_hash, hash) VALUES (?,?,?,?,?,?,?,?)`).run(
    id, batchId, eventType, actorId || null, actorRole || null, JSON.stringify(metadata), previousHash, hash
  );
  return { id, hash, previousHash };
}

function getTrace(batchId) {
  return db.prepare(`SELECT * FROM trace_events WHERE batch_id = ? ORDER BY created_at ASC`).all(batchId);
}

function verifyChain(batchId) {
  const events = db.prepare(`SELECT * FROM trace_events WHERE batch_id = ? ORDER BY created_at ASC`).all(batchId);
  let prevHash = 'GENESIS';
  for (const event of events) {
    if (event.previous_hash !== prevHash) return { valid: false, brokenAt: event.id, reason: 'previous_hash_mismatch', expected: prevHash, got: event.previous_hash };
    const raw = `${event.id}:${event.batch_id}:${event.event_type}:${event.actor_id || ''}:${event.metadata}:${event.previous_hash}`;
    const computed = crypto.createHash('sha256').update(raw).digest('hex');
    if (computed !== event.hash) return { valid: false, brokenAt: event.id, reason: 'hash_mismatch', computed, stored: event.hash };
    prevHash = event.hash;
  }
  return { valid: true, count: events.length };
}

module.exports = { appendEvent, getTrace, verifyChain };
