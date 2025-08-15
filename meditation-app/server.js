'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const { ensureDB, readDB, queueWrite } = require('./lib/store');
const pkg = require('./package.json');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi.json');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const rootDir = __dirname;

function isoDateLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isConsecutive(prevIso, nextIso) {
  const prev = new Date(prevIso + 'T00:00:00');
  const next = new Date(nextIso + 'T00:00:00');
  const diff = Math.round((prev - next) / (1000 * 60 * 60 * 24));
  return diff === 1;
}

function recomputeStats(sessions) {
  const totalSessions = sessions.length;
  const totalMinutes = Math.round(sessions.reduce((a, s) => a + (s.minutes || 0), 0));
  const dates = Array.from(new Set(sessions.map(s => s.date || isoDateLocal(new Date(s.endedAt || Date.now())))));
  dates.sort((a, b) => (a < b ? 1 : -1)); // desc
  const lastSessionDate = dates[0] || null;
  let streak = 0;
  if (lastSessionDate) {
    let current = lastSessionDate;
    streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const d = dates[i];
      if (isConsecutive(current, d)) { current = d; streak++; } else { break; }
    }
  }
  return { totalSessions, totalMinutes, lastSessionDate, streakDays: streak };
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));

// API
const api = express.Router();

api.get('/health', (req, res) => res.json({ status: 'ok' }));
api.get('/version', (req, res) => res.json({ version: pkg.version }));

api.get('/stats', async (req, res, next) => {
  try {
    await ensureDB();
    const db = await readDB();
    res.json(recomputeStats(db.sessions || []));
  } catch (e) { next(e); }
});

api.post('/stats/reset', async (req, res, next) => {
  try {
    await ensureDB();
    const db = await readDB();
    db.sessions = [];
    await queueWrite(db);
    res.json(recomputeStats(db.sessions));
  } catch (e) { next(e); }
});

api.get('/sessions', async (req, res, next) => {
  try {
    await ensureDB();
    const db = await readDB();
    let items = Array.from(db.sessions || []);
    items.sort((a, b) => (a.endedAt || 0) < (b.endedAt || 0) ? 1 : -1);
    const limit = Math.max(0, Math.min(500, Number(req.query.limit) || 100));
    res.json(items.slice(0, limit));
  } catch (e) { next(e); }
});

api.post('/sessions', async (req, res, next) => {
  try {
    const { minutes, kind } = req.body || {};
    const m = Math.max(0, Math.round(Number(minutes) || 0));
    if (!m) return res.status(400).json({ error: 'minutes required' });
    const session = { id: newId(), minutes: m, kind: typeof kind === 'string' ? kind : 'timer', endedAt: Date.now(), date: isoDateLocal(new Date()) };
    await ensureDB();
    const db = await readDB();
    db.sessions = db.sessions || [];
    db.sessions.push(session);
    await queueWrite(db);
    res.status(201).json(session);
  } catch (e) { next(e); }
});

api.delete('/sessions/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    await ensureDB();
    const db = await readDB();
    const before = db.sessions.length;
    db.sessions = (db.sessions || []).filter(s => s.id !== id);
    if (db.sessions.length === before) return res.status(404).json({ error: 'not found' });
    await queueWrite(db);
    res.status(204).end();
  } catch (e) { next(e); }
});

api.get('/wellbeing', async (req, res, next) => {
  try {
    await ensureDB();
    const db = await readDB();
    const items = Array.from(db.wellbeing || []);
    items.sort((a,b)=> (a.createdAt||0) < (b.createdAt||0) ? 1 : -1);
    const limit = Math.max(0, Math.min(500, Number(req.query.limit) || 100));
    res.json(items.slice(0, limit));
  } catch (e) { next(e); }
});

api.post('/wellbeing', async (req, res, next) => {
  try {
    const { dateIso, stress, energy, mood, notes } = req.body || {};
    const d = typeof dateIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? dateIso : isoDateLocal(new Date());
    const s = Math.max(0, Math.min(10, Number(stress)||0));
    const en = Math.max(0, Math.min(10, Number(energy)||0));
    const m = typeof mood === 'string' ? mood : 'neutral';
    const n = typeof notes === 'string' ? notes.slice(0, 2000) : '';
    const entry = { id: newId(), dateIso: d, stress: s, energy: en, mood: m, notes: n, createdAt: Date.now() };
    await ensureDB();
    const db = await readDB();
    db.wellbeing = db.wellbeing || [];
    db.wellbeing.push(entry);
    await queueWrite(db);
    res.status(201).json(entry);
  } catch (e) { next(e); }
});

api.delete('/wellbeing/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    await ensureDB();
    const db = await readDB();
    const before = (db.wellbeing||[]).length;
    db.wellbeing = (db.wellbeing||[]).filter(x=>x.id !== id);
    if (db.wellbeing.length === before) return res.status(404).json({ error: 'not found' });
    await queueWrite(db);
    res.status(204).end();
  } catch (e) { next(e); }
});

app.use('/api', api);
app.get('/openapi.json', (req, res) => res.json(openapi));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));

// Manifest with proper content-type
app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(rootDir, 'manifest.webmanifest'));
});

// Static files
app.use(express.static(rootDir, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const rel = path.relative(rootDir, filePath);
    if (rel === 'index.html' || rel === 'manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (rel === 'sw.js') {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Service-Worker-Allowed', '/');
    } else if (/\.(js|css)(?:\?.*)?$/i.test(rel) || rel === 'app.js' || rel === 'styles.css') {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

// Fallback to SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Meditation app server running at http://${HOST}:${PORT}`);
});