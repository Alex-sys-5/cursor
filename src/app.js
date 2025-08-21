import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import meditationsRouter from './routes/meditations.js';
import sessionsRouter from './routes/sessions.js';

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api/meditations', meditationsRouter);
app.use('/api/sessions', sessionsRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Fallback to index.html for root
app.get('/', (_req, res) => {
	res.sendFile(path.join(publicDir, 'index.html'));
});

// 404 for API
app.use('/api', (_req, res) => {
	res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
	console.error(err);
	res.status(500).json({ error: 'Internal Server Error' });
});

export default app;