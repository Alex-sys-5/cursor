import { Router } from 'express';
import { listMeditations, getMeditationById } from '../data/store.js';

const router = Router();

router.get('/', (req, res) => {
	const { category } = req.query;
	const items = listMeditations(category);
	res.json(items);
});

router.get('/:id', (req, res) => {
	const { id } = req.params;
	const meditation = getMeditationById(id);
	if (!meditation) return res.status(404).json({ error: 'Meditation not found' });
	return res.json(meditation);
});

export default router;