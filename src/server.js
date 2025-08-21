const express = require('express');
const xmlparser = require('express-xml-bodyparser');
const { create } = require('xmlbuilder2');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers for JSON and XML
app.use(express.json());
app.use(
  xmlparser({
    type: ['application/xml', 'text/xml'],
    trim: true,
    explicitArray: false,
    normalize: true,
    normalizeTags: true,
  })
);

// In-memory datastore
let users = [];
let nextId = 1;

function wantsXml(req) {
  const acceptHeader = req.headers['accept'] || '';
  return acceptHeader.includes('application/xml') || acceptHeader.includes('text/xml');
}

function buildUserXml(user) {
  const root = create({ version: '1.0' }).ele('User');
  root.ele('id').txt(String(user.id));
  root.ele('name').txt(user.name);
  root.ele('email').txt(user.email);
  return root.end({ prettyPrint: true });
}

function buildUsersXml(userList) {
  const root = create({ version: '1.0' }).ele('Users');
  userList.forEach((user) => {
    const u = root.ele('User');
    u.ele('id').txt(String(user.id));
    u.ele('name').txt(user.name);
    u.ele('email').txt(user.email);
  });
  return root.end({ prettyPrint: true });
}

function sendResponse(req, res, data) {
  if (wantsXml(req)) {
    if (Array.isArray(data)) {
      const xml = buildUsersXml(data);
      res.type('application/xml').send(xml);
    } else {
      const xml = buildUserXml(data);
      res.type('application/xml').send(xml);
    }
  } else {
    res.json(data);
  }
}

function extractUserPayload(req) {
  // Support both JSON and XML payloads
  if (req.is('application/xml') || req.is('text/xml')) {
    const body = req.body || {};
    // With normalizeTags: true, tags become lower-case
    const container = body.user || body;
    const name = container && (container.name && (Array.isArray(container.name) ? container.name[0] : container.name));
    const email = container && (container.email && (Array.isArray(container.email) ? container.email[0] : container.email));
    return { name, email };
  }
  return { name: req.body && req.body.name, email: req.body && req.body.email };
}

// Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.get('/users', (req, res) => {
  sendResponse(req, res, users);
});

app.post('/users', (req, res) => {
  const { name, email } = extractUserPayload(req);
  if (!name || !email) {
    return res.status(400).json({ error: 'Both name and email are required.' });
  }
  const user = { id: nextId++, name, email };
  users.push(user);
  if (wantsXml(req)) {
    res.status(201).type('application/xml').send(buildUserXml(user));
  } else {
    res.status(201).json(user);
  }
});

app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userIndex = users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const { name, email } = extractUserPayload(req);
  if (!name || !email) {
    return res.status(400).json({ error: 'Both name and email are required.' });
  }
  users[userIndex] = { id, name, email };
  sendResponse(req, res, users[userIndex]);
});

app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userIndex = users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }
  users.splice(userIndex, 1);
  res.status(204).send();
});

app.get('/', (req, res) => {
  res.send('User API is running. Visit /api-docs for Swagger UI.');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

