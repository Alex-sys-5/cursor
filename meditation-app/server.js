'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const rootDir = __dirname;

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan('dev'));

// Serve manifest with correct content-type
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
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

// SPA fallback to index.html (safe even for this PWA)
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Meditation app server running at http://${HOST}:${PORT}`);
});