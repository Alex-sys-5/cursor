const { v4: uuidv4 } = require('uuid');
const { readMeditations, writeMeditations } = require('../models/store');
const { requireFields } = require('../utils/validators');

async function listMeditations(req, res, next) {
  try {
    const meditations = await readMeditations();
    res.json(meditations);
  } catch (err) {
    next(err);
  }
}

async function getMeditation(req, res, next) {
  try {
    const { id } = req.params;
    const meditations = await readMeditations();
    const meditation = meditations.find((m) => m.id === id);
    if (!meditation) {
      return res.status(404).json({ error: 'Meditation not found' });
    }
    res.json(meditation);
  } catch (err) {
    next(err);
  }
}

async function createMeditation(req, res, next) {
  try {
    requireFields(req.body, ['title', 'description', 'durationMinutes']);
    const { title, description, durationMinutes, tags = [] } = req.body;
    const meditations = await readMeditations();
    const newMeditation = {
      id: uuidv4(),
      title,
      description,
      durationMinutes,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    meditations.push(newMeditation);
    await writeMeditations(meditations);
    res.status(201).json(newMeditation);
  } catch (err) {
    next(err);
  }
}

async function updateMeditation(req, res, next) {
  try {
    const { id } = req.params;
    const meditations = await readMeditations();
    const index = meditations.findIndex((m) => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Meditation not found' });

    const updates = req.body || {};
    const updated = { ...meditations[index], ...updates, id, updatedAt: new Date().toISOString() };
    meditations[index] = updated;
    await writeMeditations(meditations);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteMeditation(req, res, next) {
  try {
    const { id } = req.params;
    const meditations = await readMeditations();
    const index = meditations.findIndex((m) => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Meditation not found' });
    const [removed] = meditations.splice(index, 1);
    await writeMeditations(meditations);
    res.json(removed);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMeditations,
  getMeditation,
  createMeditation,
  updateMeditation,
  deleteMeditation,
};