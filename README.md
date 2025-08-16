# Meditation REST API

A simple Node.js/Express REST API for managing meditations and tracking meditation sessions. Data is persisted to JSON files in the `data` directory.

## Run

- Install dependencies: `npm install`
- Dev mode with auto-reload: `npm run dev`
- Production: `npm start` (uses PORT env var, defaults to 3000)

## Endpoints

- `GET /health` – health check

Meditations
- `GET /meditations`
- `GET /meditations/:id`
- `POST /meditations` { title, description, durationMinutes, tags? }
- `PUT /meditations/:id` partial updates supported
- `DELETE /meditations/:id`

Sessions
- `GET /sessions`
- `GET /sessions/:id`
- `POST /sessions` { meditationId, durationMinutes, notes? }
- `PUT /sessions/:id` partial updates supported
- `DELETE /sessions/:id`

Stats
- `GET /stats` → { totalMinutes, sessionsCount, perMeditation: [{ meditationId, title, sessions, minutes }] }

## Notes
- JSON file persistence is suitable for demos/small usage. Swap `src/models/store.js` for a DB in production.
