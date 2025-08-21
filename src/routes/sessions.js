import { Router } from 'express';
import { createSession, getSessionById, completeSession, getMeditationById } from '../data/store.js';

const router = Router();

router.post('/', (req, res) => {
	const { meditationId, duration } = req.body || {};
	if (!meditationId) return res.status(400).json({ error: 'meditationId is required' });
	if (!getMeditationById(meditationId)) return res.status(404).json({ error: 'Meditation not found' });
	try {
		const session = createSession({ meditationId, duration });
		res.status(201).json(session);
	} catch (err) {
		const code = err?.status || 500;
		res.status(code).json({ error: err.message || 'Failed to create session' });
	}
});

router.get('/:id', (req, res) => {
	const session = getSessionById(req.params.id);
	if (!session) return res.status(404).json({ error: 'Session not found' });
	res.json(session);
});

router.patch('/:id/complete', (req, res) => {
	const session = completeSession(req.params.id);
	if (!session) return res.status(404).json({ error: 'Session not found' });
	res.json(session);
});

export default router;