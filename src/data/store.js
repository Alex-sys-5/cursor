import { nanoid } from 'nanoid';

const meditations = [
	{
		id: 'mindfulness-basics-10',
		title: 'Mindfulness Basics',
		description: 'Start with a gentle, 10-minute introduction to mindfulness.',
		duration: 10,
		category: 'Basics'
	},
	{
		id: 'breathe-5',
		title: 'Breathe for Calm',
		description: 'Five-minute guided breathing to reset and relax.',
		duration: 5,
		category: 'Stress'
	},
	{
		id: 'focus-15',
		title: 'Deep Focus',
		description: 'A focused 15-minute session to get into flow.',
		duration: 15,
		category: 'Focus'
	},
	{
		id: 'sleep-10',
		title: 'Wind Down for Sleep',
		description: 'Ease into restful sleep with a soothing wind-down.',
		duration: 10,
		category: 'Sleep'
	},
	{
		id: 'anxiety-8',
		title: 'Ease Anxiety',
		description: 'Ground yourself and soften anxious feelings.',
		duration: 8,
		category: 'Stress'
	}
];

const sessionIdToSession = new Map();

export function listMeditations(category) {
	if (!category) return meditations.slice();
	return meditations.filter(m => m.category.toLowerCase() === String(category).toLowerCase());
}

export function getMeditationById(id) {
	return meditations.find(m => m.id === id) || null;
}

export function createSession({ meditationId, duration }) {
	const meditation = getMeditationById(meditationId);
	if (!meditation) {
		throw Object.assign(new Error('Meditation not found'), { status: 404 });
	}
	const effectiveDuration = Number(duration) > 0 ? Number(duration) : meditation.duration;
	const id = nanoid(12);
	const now = Date.now();
	const session = {
		id,
		meditationId,
		status: 'active',
		startedAt: now,
		durationMinutes: effectiveDuration,
		completedAt: null
	};
	sessionIdToSession.set(id, session);
	return session;
}

export function getSessionById(id) {
	const session = sessionIdToSession.get(id);
	if (!session) return null;
	const now = Date.now();
	const elapsedMs = session.status === 'completed' ? (session.completedAt - session.startedAt) : (now - session.startedAt);
	const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
	const remainingMinutes = Math.max(0, session.durationMinutes - elapsedMinutes);
	return { ...session, elapsedMinutes, remainingMinutes };
}

export function completeSession(id) {
	const session = sessionIdToSession.get(id);
	if (!session) return null;
	session.status = 'completed';
	session.completedAt = Date.now();
	return getSessionById(id);
}