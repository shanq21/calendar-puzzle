// sounds.js
let audioCtx = null;
let masterGain = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(audioCtx.destination);

    const unlock = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }
  return audioCtx;
}

function ensureReady() {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone({
  type = 'triangle',
  freq = 440,
  freqEnd = null,
  start = 0,
  attack = 0.003,
  decay = 0.08,
  gain = 0.12
}) {
  const ctx = ensureReady();
  if (!ctx || !masterGain) return;

  const t0 = ctx.currentTime + start;
  const t1 = t0 + Math.max(0.001, attack);
  const t2 = t1 + Math.max(0.01, decay);

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (Number.isFinite(freqEnd)) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t2);
  }

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t1);
  amp.gain.exponentialRampToValueAtTime(0.0001, t2);

  osc.connect(amp);
  amp.connect(masterGain);
  osc.start(t0);
  osc.stop(t2 + 0.02);
}

function noiseBurst({ start = 0, duration = 0.05, gain = 0.05, cutoff = 1800, q = 1.2 }) {
  const ctx = ensureReady();
  if (!ctx || !masterGain) return;

  const t0 = ctx.currentTime + start;
  const t1 = t0 + Math.max(0.01, duration);

  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(cutoff, t0);
  filter.Q.value = q;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);

  src.connect(filter);
  filter.connect(amp);
  amp.connect(masterGain);
  src.start(t0);
  src.stop(t1 + 0.01);
}

export function playPickupSound() {
  // Acrylic-thick pick up: bright click + short body resonance
  tone({ type: 'triangle', freq: 1260, freqEnd: 920, attack: 0.001, decay: 0.05, gain: 0.072 });
  tone({ type: 'sine', freq: 780, freqEnd: 520, start: 0.002, attack: 0.001, decay: 0.07, gain: 0.046 });
  tone({ type: 'sine', freq: 1720, freqEnd: 1380, start: 0.003, attack: 0.001, decay: 0.036, gain: 0.026 });
  noiseBurst({ duration: 0.028, gain: 0.02, cutoff: 2200, q: 1.6 });
}

export function playDropSound() {
  // Acrylic-thick drop: similar timbre with slightly lower body
  tone({ type: 'triangle', freq: 1080, freqEnd: 760, attack: 0.001, decay: 0.056, gain: 0.07 });
  tone({ type: 'sine', freq: 700, freqEnd: 470, start: 0.002, attack: 0.001, decay: 0.076, gain: 0.05 });
  tone({ type: 'sine', freq: 1540, freqEnd: 1180, start: 0.003, attack: 0.001, decay: 0.04, gain: 0.024 });
  noiseBurst({ duration: 0.03, gain: 0.018, cutoff: 1950, q: 1.4 });
}

export function playSnapSound() {
  // Softer, thicker snap: less brittle top-end, more body.
  tone({ type: 'triangle', freq: 980, freqEnd: 760, attack: 0.0015, decay: 0.042, gain: 0.052 });
  tone({ type: 'sine', freq: 620, freqEnd: 470, start: 0.003, attack: 0.001, decay: 0.06, gain: 0.028 });
  tone({ type: 'triangle', freq: 1320, freqEnd: 1040, start: 0.012, attack: 0.001, decay: 0.034, gain: 0.024 });
  noiseBurst({ duration: 0.022, gain: 0.01, cutoff: 1850, q: 1.2 });
}

export function playVictorySound() {
  // Key: C major. Cleaner, consonant resolution with less pitch glide.
  const phrases = [
    { freq: 523.25, start: 0.00, decay: 0.16, accent: 1.0 },  // C5
    { freq: 659.25, start: 0.16, decay: 0.16, accent: 0.95 }, // E5
    { freq: 587.33, start: 0.32, decay: 0.18, accent: 0.92 }, // D5
    { freq: 659.25, start: 0.48, decay: 0.18, accent: 1.0 },  // E5
    { freq: 783.99, start: 0.66, decay: 0.78, accent: 1.18 }  // G5 long
  ];

  // Foundation: C + G only, no glide.
  tone({
    type: 'triangle',
    freq: 196.00, // G3
    start: 0.00,
    attack: 0.012,
    decay: 0.40,
    gain: 0.028
  });
  tone({
    type: 'sine',
    freq: 261.63, // C4
    start: 0.00,
    attack: 0.01,
    decay: 0.36,
    gain: 0.02
  });

  phrases.forEach(p => {
    tone({
      type: 'square',
      freq: p.freq,
      start: p.start,
      attack: 0.01,
      decay: p.decay,
      gain: 0.038 * p.accent
    });

    tone({
      type: 'triangle',
      freq: p.freq,
      start: p.start + 0.006,
      attack: 0.012,
      decay: p.decay * 0.9,
      gain: 0.018 * p.accent
    });

    tone({
      type: 'sine',
      freq: p.freq * 2,
      start: p.start + 0.01,
      attack: 0.006,
      decay: p.decay * 0.7,
      gain: 0.012 * p.accent
    });
  });

  // Keep only one final syllable: add low C support at the same onset as the 5th note.
  tone({
    type: 'sine',
    freq: 130.81, // C3
    start: 0.66,
    attack: 0.012,
    decay: 0.84,
    gain: 0.012
  });
}
