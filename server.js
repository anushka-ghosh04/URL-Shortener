// server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const pool = require('./db'); // db.js you created
const linksRouter = require('./routes/links');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (public/index.html and public/code.html)
app.use(express.static(path.join(__dirname, 'public')));

// Mount API router
app.use('/api/links', linksRouter);

// Healthcheck
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

// Stats page shell (serves public/code.html)
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'code.html'));
});

// Redirect route (must be after /api and /code)
app.get('/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const { rows } = await pool.query('SELECT target_url FROM links WHERE code = $1', [code]);
    if (!rows.length) {
      return res.status(404).send('Not found');
    }
    const target = rows[0].target_url;
    // increment clicks and update last_clicked
    await pool.query('UPDATE links SET clicks = clicks + 1, last_clicked = now() WHERE code = $1', [code]);
    return res.redirect(302, target);
  } catch (err) {
    console.error('Redirect error', err);
    return res.status(500).send('Server error');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
