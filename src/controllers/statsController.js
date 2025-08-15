const { readSessions, readMeditations } = require('../models/store');

async function getStats(req, res, next) {
  try {
    const [sessions, meditations] = await Promise.all([
      readSessions(),
      readMeditations(),
    ]);

    const totalMinutes = sessions.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0);
    const sessionsCount = sessions.length;

    const perMeditation = meditations.map((m) => {
      const related = sessions.filter((s) => s.meditationId === m.id);
      const minutes = related.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0);
      return {
        meditationId: m.id,
        title: m.title,
        sessions: related.length,
        minutes,
      };
    });

    res.json({ totalMinutes, sessionsCount, perMeditation });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };