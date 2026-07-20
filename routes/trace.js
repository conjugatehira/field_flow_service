const { Router } = require('express');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { getTrace, verifyChain } = require('../services/trace.service');

const router = Router();

router.get('/:batchId', authenticate, (req, res) => {
  try {
    const trace = getTrace(req.params.batchId);
    if (!trace.length) return res.status(404).json({ error: 'No trace events found' });
    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:batchId/verify', authenticate, authorize('admin', 'dealer'), (req, res) => {
  try {
    const result = verifyChain(req.params.batchId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
