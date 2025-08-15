'use strict';

// State persistence helpers
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
};

// DOM helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isYesterday(prevIso) {
  if (!prevIso) return false;
  const prev = new Date(prevIso + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const diff = (today - prev) / (1000 * 60 * 60 * 24);
  return diff === 1;
}

// Theme
const Theme = {
  init() {
    const saved = storage.get('theme', 'dark');
    document.documentElement.classList.toggle('light', saved === 'light');
    $('#themeToggle').textContent = saved === 'light' ? '🌞' : '🌙';
  },
  toggle() {
    const isLight = document.documentElement.classList.toggle('light');
    $('#themeToggle').textContent = isLight ? '🌞' : '🌙';
    storage.set('theme', isLight ? 'light' : 'dark');
  }
};

// Timer logic
class MeditationTimer {
  constructor() {
    this.durationSeconds = (storage.get('timerMinutes', 10)) * 60;
    this.remainingSeconds = this.durationSeconds;
    this.state = 'idle';
    this._raf = null;
    this._startEpoch = 0;
    this._pausedAt = 0;

    this.timeDisplay = $('#timeDisplay');
    this.statusEl = $('#timerStatus');
    this.ring = $('.ring');

    this.setDurationMinutes(storage.get('timerMinutes', 10));
    this.updateTimeUI();
    this.updateRing(1);
  }

  setDurationMinutes(minutes) {
    const min = Math.max(1, Math.min(120, Number(minutes) || 1));
    storage.set('timerMinutes', min);
    this.durationSeconds = min * 60;
    if (this.state === 'idle') {
      this.remainingSeconds = this.durationSeconds;
      this.updateTimeUI();
      this.updateRing(1);
    }
  }

  start() {
    if (this.state === 'running') return;
    this.state = 'running';
    this.statusEl.textContent = 'Идёт…';
    const now = performance.now();
    this._startEpoch = now - (this._pausedAt ? (this._pausedAt - this._startEpoch) : 0);
    const tick = () => {
      if (this.state !== 'running') return;
      const elapsed = (performance.now() - this._startEpoch) / 1000;
      const remaining = Math.max(0, this.durationSeconds - elapsed);
      this.remainingSeconds = remaining;
      this.updateTimeUI();
      this.updateRing(remaining / this.durationSeconds);
      if (remaining <= 0.01) {
        this.finish();
        return;
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this._pausedAt = performance.now();
    cancelAnimationFrame(this._raf);
    this.statusEl.textContent = 'Пауза';
  }

  reset() {
    cancelAnimationFrame(this._raf);
    this.state = 'idle';
    this.remainingSeconds = this.durationSeconds;
    this._startEpoch = 0;
    this._pausedAt = 0;
    this.statusEl.textContent = 'Готово';
    this.updateTimeUI();
    this.updateRing(1);
  }

  finish() {
    cancelAnimationFrame(this._raf);
    this.state = 'idle';
    this.remainingSeconds = 0;
    this.updateTimeUI();
    this.updateRing(0);
    this.statusEl.textContent = 'Готово';
    SoundsEngineClass.beep();
    Stats.recordSession(Math.round(this.durationSeconds / 60), 'timer');
  }

  updateTimeUI() {
    this.timeDisplay.textContent = formatTime(this.remainingSeconds);
  }

  updateRing(ratio) {
    const circumference = 2 * Math.PI * 54; // r = 54 from CSS
    const offset = circumference * ratio;
    this.ring.style.strokeDashoffset = String(offset);
  }
}

// Breathing logic
const Techniques = {
  relax_breath: {
    name: 'Дыхание для расслабления',
    pattern: [2, 1, 6],
    labels: ['Вдох (нос)', 'Пауза', 'Выдох (рот)']
  },
  mindful: {
    name: 'Осознанное дыхание',
    pattern: [5, 5],
    labels: ['Наблюдение вдоха', 'Наблюдение выдоха']
  },
  relax_triangle: {
    name: 'Релаксирующий треугольник',
    pattern: [4, 8],
    labels: ['Вдох (нос)', 'Выдох (медленнее)']
  },
  activate_triangle: {
    name: 'Активирующий треугольник',
    pattern: [4, 2],
    labels: ['Вдох (нос)', 'Выдох (энергично)']
  },
  calming_wave: {
    name: 'Успокаивающая волна',
    pattern: [5, 7],
    labels: ['Вдох (волна вверх)', 'Выдох (волна вниз)']
  }
};

class BreathingSession {
  constructor() {
    this.minutes = storage.get('breathMinutes', 5);
    this.techniqueKey = storage.get('technique', 'box');
    this.state = 'idle';
    this._remaining = this.minutes * 60;
    this._phaseIndex = 0;
    this._phaseRemaining = this._currentPattern()[0];
    this._raf = null;
    this._lastTs = 0;

    this.circle = $('#breathCircle');
    this.cue = $('#breathCue');

    this._setCue('Готово');
    this._applyScale(1);
  }

  _currentPattern() {
    return Techniques[this.techniqueKey].pattern;
  }

  setTechnique(key) {
    if (!Techniques[key]) return;
    this.techniqueKey = key;
    storage.set('technique', key);
    this.reset();
  }

  setMinutes(mins) {
    const m = Math.max(1, Math.min(60, Number(mins) || 1));
    this.minutes = m;
    storage.set('breathMinutes', m);
    if (this.state === 'idle') {
      this._remaining = m * 60;
    }
  }

  start() {
    if (this.state === 'running') return;
    this.state = 'running';
    this._remaining = this.minutes * 60;
    this._phaseIndex = 0;
    this._phaseRemaining = this._currentPattern()[0];
    this._lastTs = performance.now();
    const step = () => {
      if (this.state !== 'running') return;
      const now = performance.now();
      const delta = (now - this._lastTs) / 1000;
      this._lastTs = now;
      this._remaining = Math.max(0, this._remaining - delta);

      // update current phase, carry overshoot to next phases to avoid stalling
      this._phaseRemaining -= delta;
      while (this._phaseRemaining <= 0) {
        const overshoot = -this._phaseRemaining;
        this._advancePhase();
        this._phaseRemaining -= overshoot;
      }

      this._animateByPhase();
      if (this._remaining <= 0.01) {
        this.finish();
        return;
      }
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    cancelAnimationFrame(this._raf);
    this._setCue('Пауза');
  }

  reset() {
    cancelAnimationFrame(this._raf);
    this.state = 'idle';
    this._remaining = this.minutes * 60;
    this._phaseIndex = 0;
    this._phaseRemaining = this._currentPattern()[0];
    this._applyScale(1);
    this._setCue('Готово');
  }

  finish() {
    cancelAnimationFrame(this._raf);
    this.state = 'idle';
    this._applyScale(1);
    this._setCue('Готово');
    SoundsEngineClass.beep();
    Stats.recordSession(this.minutes, 'breath');
  }

  _advancePhase() {
    const pattern = this._currentPattern();
    this._phaseIndex = (this._phaseIndex + 1) % pattern.length;
    this._phaseRemaining = pattern[this._phaseIndex];
    this._setCue(Techniques[this.techniqueKey].labels[this._phaseIndex] + ' · ' + Math.ceil(this._phaseRemaining) + 'с');
    SoundsEngineClass.tick();
  }

  _animateByPhase() {
    const labels = Techniques[this.techniqueKey].labels;
    const pattern = this._currentPattern();
    const phase = this._phaseIndex % pattern.length;
    const label = labels[phase] || '';
    const secondsLeft = Math.max(0, Math.ceil(this._phaseRemaining));
    this._setCue(`${label} · ${secondsLeft}с`);

    if (label.toLowerCase().includes('вдох')) {
      this._applyScale(1.15);
    } else if (label.toLowerCase().includes('выдох')) {
      this._applyScale(0.9);
    } else {
      this._applyScale(1.03);
    }
  }

  _applyScale(scale) {
    this.circle.style.setProperty('--breath-scale', String(scale));
  }

  _setCue(text) {
    this.cue.textContent = text;
  }
}

// WebAudio ambient sounds
class SoundsEngineClass {
  constructor() {
    this.ctx = null;
    this.masterGain = null;

    this.sounds = {
      rain: { isOn: false, gain: null, node: null },
      forest: { isOn: false, gain: null, node: null },
      stream: { isOn: false, gain: null, node: null },
      om: { isOn: false, gain: null, node: null }
    };

    this._ensureContext = this._ensureContext.bind(this);
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = storage.get('masterVolume', 1);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  setMasterVolume(v) {
    this._ensureContext();
    const vol = Math.max(0, Math.min(1, Number(v) || 0));
    this.masterGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
    storage.set('masterVolume', vol);
  }

  static _makeWhiteNoiseBuffer(ctx) {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _spawnNoise(buffer, color = 'white') {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    let node = src;

    if (color === 'rain') {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      node.connect(lp);
      node = lp;
    }

    if (color === 'forest') {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      bp.Q.value = 0.6;
      node.connect(bp);
      node = bp;
    }

    if (color === 'stream') {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 600;
      node.connect(hp);
      node = hp;
    }

    return { src, node };
  }

  _ensureGain(key) {
    if (!this.sounds[key].gain) {
      const gain = this.ctx.createGain();
      gain.gain.value = storage.get(`${key}Volume`, 0.3);
      gain.connect(this.masterGain);
      this.sounds[key].gain = gain;
    }
    return this.sounds[key].gain;
  }

  _startNoise(key, color) {
    this._ensureContext();
    const buffer = SoundsEngineClass._makeWhiteNoiseBuffer(this.ctx);
    const { src, node } = this._spawnNoise(buffer, color);
    const gain = this._ensureGain(key);
    node.connect(gain);
    src.start();
    this.sounds[key].node = src;
  }

  _stopNode(key) {
    const s = this.sounds[key];
    if (s.node && typeof s.node.stop === 'function') {
      try { s.node.stop(); } catch {}
      s.node.disconnect?.();
    }
    s.node = null;
  }

  toggleRain(on) {
    if (on) this._startNoise('rain', 'rain'); else this._stopNode('rain');
    this.sounds.rain.isOn = on; storage.set('rainOn', on);
  }
  toggleForest(on) {
    if (on) this._startNoise('forest', 'forest'); else this._stopNode('forest');
    this.sounds.forest.isOn = on; storage.set('forestOn', on);
  }
  toggleStream(on) {
    if (on) this._startNoise('stream', 'stream'); else this._stopNode('stream');
    this.sounds.stream.isOn = on; storage.set('streamOn', on);
  }
  toggleOm(on) {
    this._ensureContext();
    if (on) {
      const gain = this._ensureGain('om');
      const baseFreq = 136.1; // С основной частотой Ом
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine'; osc1.frequency.value = baseFreq;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine'; osc2.frequency.value = baseFreq * 2;
      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine'; osc3.frequency.value = baseFreq * 0.5;
      const partialGain = this.ctx.createGain();
      partialGain.gain.value = 0.6;
      osc1.connect(partialGain); osc2.connect(partialGain); osc3.connect(partialGain);
      partialGain.connect(gain);
      osc1.start(); osc2.start(); osc3.start();
      this.sounds.om.node = {
        stop: () => { try { osc1.stop(); osc2.stop(); osc3.stop(); } catch {} },
        disconnect: () => { osc1.disconnect(); osc2.disconnect(); osc3.disconnect(); partialGain.disconnect(); }
      };
    } else {
      this._stopNode('om');
    }
    this.sounds.om.isOn = on; storage.set('omOn', on);
  }

  setVolume(key, vol) {
    this._ensureContext();
    const gain = this._ensureGain(key);
    const v = Math.max(0, Math.min(1, Number(vol) || 0));
    gain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.05);
    storage.set(`${key}Volume`, v);
  }

  static beep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
      o.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  static tick() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 660;
      g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      o.stop(ctx.currentTime + 0.17);
    } catch {}
  }
}

const SoundsEngine = new SoundsEngineClass();
// Backward-compat: ensure instance has tick/beep methods for old call sites
if (typeof SoundsEngine.tick !== 'function') SoundsEngine.tick = SoundsEngineClass.tick;
if (typeof SoundsEngine.beep !== 'function') SoundsEngine.beep = SoundsEngineClass.beep;

// Statistics via REST with offline fallback
const Stats = {
  async fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      storage.set('meditationStats', data);
      return data;
    } catch {
      return storage.get('meditationStats', { totalSessions: 0, totalMinutes: 0, lastSessionDate: null, streakDays: 0 });
    }
  },
  async recordSession(minutes, kind) {
    const m = Math.max(0, Math.round(Number(minutes) || 0));
    try {
      await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: m, kind }) });
    } catch {
      const s = storage.get('meditationStats', { totalSessions: 0, totalMinutes: 0, lastSessionDate: null, streakDays: 0 });
      s.totalSessions += 1;
      s.totalMinutes += m;
      if (s.lastSessionDate === todayStr()) {
      } else if (isYesterday(s.lastSessionDate)) {
        s.streakDays += 1;
      } else {
        s.streakDays = 1;
      }
      s.lastSessionDate = todayStr();
      storage.set('meditationStats', s);
    } finally {
      const latest = await this.fetchStats();
      UI.updateStats(latest);
    }
  }
};

// UI glue and behavior
const UI = {
  init() {
    // Tabs
    $$('.tab').forEach(btn => {
      btn.addEventListener('click', () => UI.switchTab(btn.dataset.target));
    });

    const brand = document.querySelector('.brand');
    if (brand) { brand.addEventListener('click', () => UI.switchTab('timer')); }

    // Theme
    $('#themeToggle').addEventListener('click', Theme.toggle);
    $('#themeToggle2').addEventListener('click', Theme.toggle);

    // Timer
    this.timer = new MeditationTimer();
    $('#customMinutes').addEventListener('change', (e) => {
      this.timer.setDurationMinutes(e.target.value);
      UI._updateTimerButtons();
    });

    $$('.preset').forEach(p => p.addEventListener('click', () => {
      const m = Number(p.dataset.min);
      $('#customMinutes').value = String(m);
      this.timer.setDurationMinutes(m);
      UI._updateTimerButtons();
    }));

    $('#startTimer').addEventListener('click', () => { this.timer.start(); UI._updateTimerButtons(true); });
    $('#pauseTimer').addEventListener('click', () => { this.timer.pause(); UI._updateTimerButtons(); });
    $('#resetTimer').addEventListener('click', () => { this.timer.reset(); UI._updateTimerButtons(); });

    // Breath
    this.breath = new BreathingSession();
    $('#technique').value = storage.get('technique', 'relax_breath');
    $('#technique').addEventListener('change', (e) => this.breath.setTechnique(e.target.value));
    $('#breathMinutes').value = storage.get('breathMinutes', 5);
    $('#breathMinutes').addEventListener('change', (e) => this.breath.setMinutes(e.target.value));

    $('#startBreath').addEventListener('click', () => { this.breath.start(); UI._updateBreathButtons(true); });
    $('#pauseBreath').addEventListener('click', () => { this.breath.pause(); UI._updateBreathButtons(); });
    $('#resetBreath').addEventListener('click', () => { this.breath.reset(); UI._updateBreathButtons(); });

    // Sounds
    $('#masterVolume').value = storage.get('masterVolume', 1);
    $('#masterVolume').addEventListener('input', (e) => SoundsEngine.setMasterVolume(e.target.value));

    const soundKeys = ['rain','forest','stream','om'];
    soundKeys.forEach(key => {
      const toggle = $(`#${key}Toggle`);
      const volume = $(`#${key}Volume`);
      const on = storage.get(`${key}On`, false);
      const vol = storage.get(`${key}Volume`, volume.value);
      toggle.checked = on; volume.value = vol;
      volume.addEventListener('input', (e) => SoundsEngine.setVolume(key, e.target.value));
      toggle.addEventListener('change', (e) => {
        // resume context on first user action
        SoundsEngine._ensureContext();
        const fn = {
          rain: SoundsEngine.toggleRain.bind(SoundsEngine),
          forest: SoundsEngine.toggleForest.bind(SoundsEngine),
          stream: SoundsEngine.toggleStream.bind(SoundsEngine),
          om: SoundsEngine.toggleOm.bind(SoundsEngine)
        }[key];
        fn(e.target.checked);
      });
      if (on) toggle.dispatchEvent(new Event('change'));
    });

    // Stats initial
    Stats.fetchStats().then(UI.updateStats);

    // PWA install
    this._installPrompt = null;
    const installBtn = $('#installBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._installPrompt = e;
      installBtn.disabled = false;
    });
    installBtn.addEventListener('click', async () => {
      if (!this._installPrompt) return;
      this._installPrompt.prompt();
      await this._installPrompt.userChoice.catch(() => {});
      this._installPrompt = null;
      installBtn.disabled = true;
    });

    // SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (document.querySelector('#timer.view.active')) {
          if (this.timer.state === 'running') this.timer.pause(); else this.timer.start();
          UI._updateTimerButtons(this.timer.state === 'running');
        } else if (document.querySelector('#breath.view.active')) {
          if (this.breath.state === 'running') this.breath.pause(); else this.breath.start();
          UI._updateBreathButtons(this.breath.state === 'running');
        }
      }
    });

    UI._updateTimerButtons();
    UI._updateBreathButtons();

    // Meditations
    UI._initMeditations();
  },

  switchTab(id) {
    $$('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.target === id));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
  },

  _initMeditations() {
    const categories = {
      career: {
        title: 'Карьера',
        tracks: [
          {
            id: 'career-1',
            title: 'Карьера — атмосфера фокуса (Dzen видео)',
            source: 'https://dzen.ru/video/watch/63bcd3bb3fd9f977910d3056',
            tip: 'Если аудио не воспроизводится, откройте источник в новой вкладке.'
          }
        ]
      },
      money: { title: 'Деньги', tracks: [] },
      relax: { title: 'Расслабление', tracks: [] },
      love: { title: 'Любовь', tracks: [] },
      energy: { title: 'Заряд энергии', tracks: [] },
      sex: { title: 'Секс', tracks: [] }
    };

    const tracksWrap = document.getElementById('meditationTracks');
    const categoryTitle = document.getElementById('medCategoryTitle');
    const list = document.getElementById('tracksList');

    const renderTracks = (key) => {
      const cat = categories[key];
      if (!cat) return;
      categoryTitle.textContent = cat.title;
      list.innerHTML = '';
      cat.tracks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'track-row';
        const btn = document.createElement('button');
        btn.className = 'btn play-btn';
        btn.textContent = '▶';
        const meta = document.createElement('div'); meta.className = 'track-meta';
        const title = document.createElement('div'); title.className = 'track-title'; title.textContent = t.title;
        const hint = document.createElement('div'); hint.className = 'muted small'; hint.textContent = t.tip || '';
        meta.appendChild(title); meta.appendChild(hint);

        // Try to embed Dzen page in an iframe container for audio playback
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.display = 'none';
        const iframe = document.createElement('iframe');
        iframe.src = t.source;
        iframe.allow = 'autoplay; encrypted-media';
        iframe.referrerPolicy = 'no-referrer';
        iframe.loading = 'lazy';
        iframe.style.width = '100%';
        iframe.style.height = '420px';
        iframe.style.border = '1px solid var(--ring)';
        iframe.style.borderRadius = '12px';
        container.appendChild(iframe);

        let opened = false;
        btn.addEventListener('click', () => {
          opened = !opened;
          container.style.display = opened ? 'block' : 'none';
          btn.textContent = opened ? '⏸' : '▶';
        });

        row.appendChild(btn); row.appendChild(meta);
        list.appendChild(row);
        list.appendChild(container);
      });
      tracksWrap.classList.remove('hidden');
    };

    $$('.meditation-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const key = tile.dataset.key;
        renderTracks(key);
        UI.switchTab('meditations');
      });
    });
  },

  _updateTimerButtons(isRunning) {
    const running = isRunning ?? (this.timer.state === 'running');
    $('#startTimer').disabled = running;
    $('#pauseTimer').disabled = !running;
    $('#resetTimer').disabled = running && this.timer.remainingSeconds > 1 ? false : (this.timer.state === 'idle');
  },

  _updateBreathButtons(isRunning) {
    const running = isRunning ?? (this.breath.state === 'running');
    $('#startBreath').disabled = running;
    $('#pauseBreath').disabled = !running;
    $('#resetBreath').disabled = running ? false : (this.breath.state === 'idle');
  },

  updateStats(stats) {
    $('#statSessions').textContent = String(stats.totalSessions);
    $('#statMinutes').textContent = String(stats.totalMinutes);
    $('#statStreak').textContent = String(stats.streakDays);
  }
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  UI.init();
});