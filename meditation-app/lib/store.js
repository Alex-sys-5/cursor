'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const defaultDB = {
  stats: { totalSessions: 0, totalMinutes: 0, lastSessionDate: null, streakDays: 0 },
  sessions: [],
  wellbeing: []
};

async function ensureDB() {
  await fsp.mkdir(path.dirname(DB_PATH), { recursive: true }).catch(() => {});
  try {
    await fsp.access(DB_PATH, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf8');
  }
}

async function readDB() {
  await ensureDB();
  const text = await fsp.readFile(DB_PATH, 'utf8').catch(() => '');
  if (!text) return JSON.parse(JSON.stringify(defaultDB));
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(JSON.stringify(defaultDB));
  }
}

async function writeDB(db) {
  await ensureDB();
  const tmp = DB_PATH + '.tmp';
  const data = JSON.stringify(db, null, 2);
  await fsp.writeFile(tmp, data, 'utf8');
  await fsp.rename(tmp, DB_PATH);
}

let writeQueue = Promise.resolve();
function queueWrite(db) {
  writeQueue = writeQueue.then(() => writeDB(db)).catch(() => {});
  return writeQueue;
}

module.exports = { DB_PATH, defaultDB, ensureDB, readDB, writeDB, queueWrite };