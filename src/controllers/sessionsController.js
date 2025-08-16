const { v4: uuidv4 } = require('uuid');
const { readSessions, writeSessions, readMeditations } = require('../models/store');
const { requireFields } = require('../utils/validators');

async function listSessions(req, res, next) {
  try {
    const sessions = await readSessions();
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const { id } = req.params;
    const sessions = await readSessions();
    const session = sessions.find((s) => s.id === id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    next(err);
  }
}

async function createSession(req, res, next) {
  try {
    requireFields(req.body, ['meditationId', 'durationMinutes']);
    const { meditationId, durationMinutes, notes = '' } = req.body;

    const meditations = await readMeditations();
    const meditation = meditations.find((m) => m.id === meditationId);
    if (!meditation) {
      const error = new Error('Invalid meditationId');
      error.status = 400;
      throw error;
    }

    const sessions = await readSessions();
    const newSession = {
      id: uuidv4(),
      meditationId,
      durationMinutes,
      notes,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.push(newSession);
    await writeSessions(sessions);
    res.status(201).json(newSession);
  } catch (err) {
    next(err);
  }
}

async function updateSession(req, res, next) {
  try {
    const { id } = req.params;
    const sessions = await readSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ error: 'Session not found' });

    const updates = req.body || {};
    if (updates.meditationId) {
      const meditations = await readMeditations();
      const meditation = meditations.find((m) => m.id === updates.meditationId);
      if (!meditation) {
        const error = new Error('Invalid meditationId');
        error.status = 400;
        throw error;
      }
    }

    const updated = { ...sessions[index], ...updates, id, updatedAt: new Date().toISOString() };
    sessions[index] = updated;
    await writeSessions(sessions);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    const { id } = req.params;
    const sessions = await readSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ error: 'Session not found' });
    const [removed] = sessions.splice(index, 1);
    await writeSessions(sessions);
    res.json(removed);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
};