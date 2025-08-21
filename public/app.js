const meditationsEl = document.getElementById('meditations');
const yearEl = document.getElementById('year');
const playerEl = document.getElementById('player');
const playerCloseBtn = document.getElementById('player-close');
const playerNameEl = document.getElementById('player-name');
const playerTimeEl = document.getElementById('player-time');
const progressBarEl = document.getElementById('progress-bar');
const btnPlay = document.getElementById('btn-play');
const btnComplete = document.getElementById('btn-complete');

let tickInterval = null;
let activeSession = null;
let paused = false;
let pausedAt = 0;
let pausedElapsed = 0;

yearEl.textContent = new Date().getFullYear();

async function fetchMeditations() {
	const res = await fetch('/api/meditations');
	if (!res.ok) throw new Error('Failed to fetch meditations');
	return res.json();
}

function formatMinutesToMmSs(totalMinutes, secondsOverride) {
	const totalSeconds = secondsOverride != null ? secondsOverride : Math.max(0, Math.round(totalMinutes * 60));
	const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
	const ss = String(totalSeconds % 60).padStart(2, '0');
	return `${mm}:${ss}`;
}

function renderMeditations(items) {
	meditationsEl.innerHTML = '';
	for (const m of items) {
		const card = document.createElement('div');
		card.className = 'card';
		card.innerHTML = `
			<div class="card__meta">${m.category} · ${m.duration} мин</div>
			<h3>${m.title}</h3>
			<p>${m.description}</p>
			<div class="card__footer">
				<button class="btn btn--primary" data-id="${m.id}">Начать</button>
				<a class="btn btn--ghost" href="#" data-info="${m.id}">Подробнее</a>
			</div>
		`;
		card.querySelector('button').addEventListener('click', () => startSession(m.id));
		card.querySelector('[data-info]').addEventListener('click', (e) => {
			e.preventDefault();
			alert(`${m.title}\n\nДлительность: ${m.duration} минут\nКатегория: ${m.category}`);
		});
		meditationsEl.appendChild(card);
	}
}

async function startSession(meditationId) {
	const res = await fetch('/api/sessions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ meditationId })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		alert(err.error || 'Не удалось начать сессию');
		return;
	}
	activeSession = await res.json();
	paused = false;
	pausedElapsed = 0;
	openPlayer();
	startTick();
}

function openPlayer() {
	playerEl.classList.remove('hidden');
	const mName = activeSession?.meditationId || 'Сессия';
	playerNameEl.textContent = mName.replaceAll('-', ' ');
	btnPlay.textContent = 'Пауза';
	progressBarEl.style.width = '0%';
	updateTimeUI();
}

function closePlayer() {
	playerEl.classList.add('hidden');
	stopTick();
	activeSession = null;
}

function startTick() {
	stopTick();
	tickInterval = setInterval(updateProgress, 1000);
}

function stopTick() {
	if (tickInterval) clearInterval(tickInterval);
	tickInterval = null;
}

async function refreshSession() {
	if (!activeSession) return;
	const res = await fetch(`/api/sessions/${activeSession.id}`);
	if (!res.ok) return;
	activeSession = await res.json();
}

function updateTimeUI() {
	if (!activeSession) return;
	const totalSeconds = activeSession.durationMinutes * 60;
	const elapsedSeconds = Math.min(totalSeconds, (activeSession.elapsedMinutes * 60) + pausedElapsed);
	playerTimeEl.textContent = `${formatMinutesToMmSs(null, elapsedSeconds)} / ${formatMinutesToMmSs(null, totalSeconds)}`;
	const pct = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));
	progressBarEl.style.width = pct + '%';
}

async function updateProgress() {
	if (!activeSession || paused) return;
	await refreshSession();
	if (!activeSession) return;
	if (activeSession.remainingMinutes <= 0) {
		await complete();
		return;
	}
	updateTimeUI();
}

async function complete() {
	if (!activeSession) return;
	await fetch(`/api/sessions/${activeSession.id}/complete`, { method: 'PATCH' });
	await refreshSession();
	updateTimeUI();
	alert('Сессия завершена! Отличная работа.');
	closePlayer();
}

playerCloseBtn.addEventListener('click', closePlayer);
btnComplete.addEventListener('click', () => complete());
btnPlay.addEventListener('click', () => {
	if (!activeSession) return;
	paused = !paused;
	btnPlay.textContent = paused ? 'Продолжить' : 'Пауза';
});

fetchMeditations().then(renderMeditations).catch(err => {
	console.error(err);
	meditationsEl.innerHTML = '<p>Не удалось загрузить медитации.</p>';
});