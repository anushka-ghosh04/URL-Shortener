// routes/links.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

// Validate URL using WHATWG URL
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateUniqueCode() {
  for (let len = 6; len <= 8; len++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode(len);
      const { rows } = await pool.query('SELECT code FROM links WHERE code = $1', [code]);
      if (!rows.length) return code;
    }
  }
  throw new Error('Unable to generate unique code');
}

router.post('/', async (req, res) => {
  const { target_url, code: customCode } = req.body || {};

  if (!target_url) return res.status(400).json({ error: 'target_url required' });
  if (!isValidUrl(target_url)) return res.status(400).json({ error: 'Invalid URL' });

  let code = customCode && String(customCode).trim();

  try {
    if (code) {
      if (!CODE_REGEX.test(code))
        return res.status(400).json({ error: 'Custom code must match [A-Za-z0-9]{6,8}' });

      const { rows } = await pool.query('SELECT code FROM links WHERE code = $1', [code]);
      if (rows.length) return res.status(409).json({ error: 'Code already exists' });
    } else {
      code = await generateUniqueCode();
    }

    await pool.query(
      'INSERT INTO links(code, target_url) VALUES ($1, $2)',
      [code, target_url]
    );

    const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return res.status(201).json({
      code,
      short_url: `${base}/${code}`,
      target_url,
      clicks: 0
    });
  } catch (err) {
    console.error('POST /api/links error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT code, target_url, clicks, last_clicked, created_at FROM links ORDER BY created_at DESC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/links error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const { rows } = await pool.query(
      'SELECT code, target_url, clicks, last_clicked, created_at FROM links WHERE code = $1',
      [code]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/links/:code error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const result = await pool.query('DELETE FROM links WHERE code = $1', [code]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/links/:code error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
