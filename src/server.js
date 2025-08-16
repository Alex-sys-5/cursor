const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { z } = require('zod');
const { nanoid } = require('nanoid');
const { readDatabase, writeDatabase } = require('./storage');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, '..', 'data', 'meditations.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const MeditationCreateSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	durationSec: z.number().int().positive(),
	category: z.string().min(1),
	audioUrl: z.string().url(),
	imageUrl: z.string().url().optional()
});

const MeditationUpdateSchema = MeditationCreateSchema.partial();

app.get('/api/health', (req, res) => {
	res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/meditations', async (req, res, next) => {
	try {
		const db = await readDatabase(DATA_PATH);
		res.json(db.meditations);
	} catch (err) {
		next(err);
	}
});

app.get('/api/meditations/:id', async (req, res, next) => {
	try {
		const db = await readDatabase(DATA_PATH);
		const meditation = db.meditations.find(m => m.id === req.params.id);
		if (!meditation) return res.status(404).json({ error: 'Not found' });
		res.json(meditation);
	} catch (err) {
		next(err);
	}
});

app.post('/api/meditations', async (req, res, next) => {
	try {
		const parsed = MeditationCreateSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
		}
		const db = await readDatabase(DATA_PATH);
		const meditation = { id: nanoid(), ...parsed.data, createdAt: new Date().toISOString() };
		db.meditations.push(meditation);
		await writeDatabase(DATA_PATH, db);
		res.status(201).json(meditation);
	} catch (err) {
		next(err);
	}
});

app.put('/api/meditations/:id', async (req, res, next) => {
	try {
		const parsed = MeditationUpdateSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
		}
		const db = await readDatabase(DATA_PATH);
		const idx = db.meditations.findIndex(m => m.id === req.params.id);
		if (idx === -1) return res.status(404).json({ error: 'Not found' });
		db.meditations[idx] = { ...db.meditations[idx], ...parsed.data, updatedAt: new Date().toISOString() };
		await writeDatabase(DATA_PATH, db);
		res.json(db.meditations[idx]);
	} catch (err) {
		next(err);
	}
});

app.delete('/api/meditations/:id', async (req, res, next) => {
	try {
		const db = await readDatabase(DATA_PATH);
		const idx = db.meditations.findIndex(m => m.id === req.params.id);
		if (idx === -1) return res.status(404).json({ error: 'Not found' });
		const removed = db.meditations.splice(idx, 1)[0];
		await writeDatabase(DATA_PATH, db);
		res.json({ deleted: true, meditation: removed });
	} catch (err) {
		next(err);
	}
});

// Fallback to SPA index for non-API GET requests (Express 5 compatible)
app.use((req, res, next) => {
	if (req.method !== 'GET') return next();
	if (req.path.startsWith('/api')) return next();
	const indexPath = path.join(__dirname, '..', 'public', 'index.html');
	if (fs.existsSync(indexPath)) {
		return res.sendFile(indexPath);
	}
	return res.status(404).send('Not Found');
});

// Error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
	console.log(`Meditation app server listening on http://localhost:${PORT}`);
	console.log(`Swagger UI available at http://localhost:${PORT}/api/docs`);
});