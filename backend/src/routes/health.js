const router = require('express').Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

module.exports = router;