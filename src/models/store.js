const fs = require('fs').promises;
const path = require('path');

const meditationsFilePath = path.resolve(__dirname, '../../data/meditations.json');
const sessionsFilePath = path.resolve(__dirname, '../../data/sessions.json');

async function ensureDir(filePath) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(filePath);
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, serialized, 'utf-8');
}

async function readMeditations() {
  return readJson(meditationsFilePath);
}

async function writeMeditations(meditations) {
  return writeJson(meditationsFilePath, meditations);
}

async function readSessions() {
  return readJson(sessionsFilePath);
}

async function writeSessions(sessions) {
  return writeJson(sessionsFilePath, sessions);
}

module.exports = {
  readMeditations,
  writeMeditations,
  readSessions,
  writeSessions,
};