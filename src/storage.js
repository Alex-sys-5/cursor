const fs = require('fs/promises');
const path = require('path');

async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}

async function readDatabase(jsonPath) {
	try {
		await ensureDir(path.dirname(jsonPath));
		const content = await fs.readFile(jsonPath, 'utf-8');
		const parsed = JSON.parse(content);
		if (!parsed.meditations) parsed.meditations = [];
		return parsed;
	} catch (err) {
		if (err.code === 'ENOENT') {
			const empty = { meditations: [] };
			await writeDatabase(jsonPath, empty);
			return empty;
		}
		throw err;
	}
}

async function writeDatabase(jsonPath, db) {
	await ensureDir(path.dirname(jsonPath));
	await fs.writeFile(jsonPath, JSON.stringify(db, null, 2));
}

module.exports = { readDatabase, writeDatabase };