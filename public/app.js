/* globals gsap, ScrollTrigger, Lenis */
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function pad(n) { return String(n).padStart(2, '0'); }
function formatTime(sec) {
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

async function fetchMeditations() {
  const res = await fetch('/api/meditations');
  if (!res.ok) throw new Error('Failed to load meditations');
  return res.json();
}

let allMeditations = [];

function activateRevealsInList() {
  const listRoot = $('#meditation-list');
  if (!listRoot) return;
  const revealEls = $$('.reveal', listRoot);
  // Instantly show list items to avoid jank from many triggers
  revealEls.forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}

function renderMeditations(list) {
  const el = $('#meditation-list');
  el.innerHTML = '';
  for (const m of list) {
    const item = document.createElement('div');
    item.className = 'meditation-item reveal';
    item.dataset.id = m.id;
    item.innerHTML = `
      <img class=\"meditation-cover\" src=\"${m.imageUrl || ''}\" alt=\"${m.title}\" loading=\"lazy\" referrerpolicy=\"no-referrer\">\n      <div class=\"meditation-body\">\n        <div class=\"meditation-title\">${m.title}</div>\n        <div class=\"meditation-meta\">${m.category} • ${Math.round(m.durationSec / 60)} мин</div>\n      </div>\n    `;
    item.addEventListener('click', () => playMeditation(m));
    el.appendChild(item);
  }
  // Make sure newly injected items are visible
  activateRevealsInList();
  // Recalculate triggers for the rest of page
  if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
}

function setupPlayer() {
  const audio = $('#audio');
  const btnPlay = $('#btn-play');
  const seek = $('#seek');
  const time = $('#player-time');

  let isSeeking = false;

  btnPlay.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) audio.play(); else audio.pause();
  });

  audio.addEventListener('play', () => btnPlay.textContent = '⏸');
  audio.addEventListener('pause', () => btnPlay.textContent = '▶');

  audio.addEventListener('timeupdate', () => {
    if (!isSeeking && audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      seek.value = String(progress);
    }
    time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)}`;
  });

  seek.addEventListener('input', () => { isSeeking = true; });
  seek.addEventListener('change', () => {
    if (audio.duration) {
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    }
    isSeeking = false;
  });
}

function playMeditation(m) {
  const audio = $('#audio');
  const title = $('#player-title');
  title.textContent = m.title;
  audio.src = m.audioUrl;
  audio.play().catch(() => {});
}

function splitText(selector) {
  $$(selector).forEach(node => {
    const text = node.textContent.trim();
    node.textContent = '';
    const frag = document.createDocumentFragment();
    text.split(' ').forEach((word, idx) => {
      const span = document.createElement('span');
      span.textContent = (idx === 0 ? '' : ' ') + word;
      frag.appendChild(span);
    });
    node.appendChild(frag);
  });
}

function initGSAP() {
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ limitCallbacks: true });

  splitText('.split');

  gsap.to('.split span', {
    y: 0,
    opacity: 1,
    ease: 'power3.out',
    duration: 1.0,
    stagger: 0.04
  });

  // Keep reveal animations on general content
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      ease: 'power3.out',
      duration: 0.8,
      scrollTrigger: {
        trigger: el,
        start: 'top 80%'
      }
    });
  });

  // Parallax only for hero/about/benefit visuals (not for dynamic meditation items)
  gsap.utils.toArray('.parallax').forEach((el) => {
    gsap.to(el, {
      yPercent: -6,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        scrub: 0.3,
        start: 'top bottom',
        end: 'bottom top'
      }
    });
  });

  // Magnetic buttons
  $$('.magnetic').forEach((btn) => {
    let x = 0, y = 0;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width - 0.5) * 10;
      y = ((e.clientY - r.top) / r.height - 0.5) * 10;
      gsap.to(btn, { x, y, duration: 0.3, ease: 'power3.out' });
    }, { passive: true });
    btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: 'power3.out' }));
  });
}

function initLenis() {
  if (!window.Lenis) return;
  const lenis = new Lenis({ duration: 0.95, smoothWheel: true, smoothTouch: false });
  window.__lenis = lenis;
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  lenis.on('scroll', () => { if (window.ScrollTrigger) ScrollTrigger.update(); });
}

function scrollToMeditations() {
  const el = document.querySelector('#meditations');
  if (!el) return;
  if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
    window.__lenis.scrollTo(el);
  } else {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function showStressMeditations() {
  const filtered = allMeditations.filter(m => (m.category || '').toLowerCase() === 'снятие стресса');
  renderMeditations(filtered.length ? filtered : allMeditations);
  scrollToMeditations();
}

function showSleepMeditations() {
  const filtered = allMeditations.filter(m => (m.category || '').toLowerCase() === 'глубокий сон');
  renderMeditations(filtered.length ? filtered : allMeditations);
  scrollToMeditations();
}

function showFocusMeditations() {
  const filtered = allMeditations.filter(m => (m.category || '').toLowerCase() === 'фокус');
  renderMeditations(filtered.length ? filtered : allMeditations);
  scrollToMeditations();
}

function initWebGLBackground() {
  if (!window.THREE) return;

  const canvas = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.3));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const geometry = new THREE.PlaneGeometry(2, 2);

  const fragmentShader = `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(in vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main(){
      vec2 uv = vUv;
      vec2 p = uv * 3.0;
      float t = uTime * 0.06;

      float n = 0.0;
      n += 0.5 * noise(p + t);
      n += 0.25 * noise(p * 2.0 - t * 1.6);
      n += 0.125 * noise(p * 4.0 + t * 2.4);

      vec2 m = uMouse;
      float dist = distance(uv, m);
      float ripple = 0.08 / (dist * 12.0 + 0.4);

      vec3 c1 = vec3(0.54, 0.36, 1.0);
      vec3 c2 = vec3(0.13, 0.88, 1.0);
      vec3 color = mix(c1, c2, n + ripple);

      float vign = smoothstep(1.2, 0.2, distance(uv, vec2(0.5)));
      color *= vign;

      gl_FragColor = vec4(color, 0.85);
    }
  `;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }
  };

  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (e) => {
    uniforms.uMouse.value.x = e.clientX / window.innerWidth;
    uniforms.uMouse.value.y = 1.0 - e.clientY / window.innerHeight;
  }, { passive: true });

  let last = 0;
  function tick(t) {
    if (t - last > 33) { // ~30 FPS cap to reduce jank
      uniforms.uTime.value = t * 0.001;
      renderer.render(scene, camera);
      last = t;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
  });
}

async function main() {
  $('#year').textContent = new Date().getFullYear();

  try {
    const list = await fetchMeditations();
    allMeditations = list;
    renderMeditations(list);
  } catch (e) {
    console.error(e);
  }

  setupPlayer();
  initGSAP();
  initLenis();
  initWebGLBackground();

  const stressCard = $('#benefit-stress');
  if (stressCard) {
    stressCard.addEventListener('click', showStressMeditations);
    stressCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showStressMeditations(); } });
  }
  const sleepCard = $('#benefit-sleep');
  if (sleepCard) {
    sleepCard.addEventListener('click', showSleepMeditations);
    sleepCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSleepMeditations(); } });
  }
  const focusCard = $('#benefit-focus');
  if (focusCard) {
    focusCard.addEventListener('click', showFocusMeditations);
    focusCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showFocusMeditations(); } });
  }
}

window.addEventListener('DOMContentLoaded', main);