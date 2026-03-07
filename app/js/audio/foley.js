// Foley Sound Module - procedurally synthesized nature sounds
import { engine } from './engine.js';

// All foley sounds are procedurally generated — no sample files needed.

class FoleySound {
  constructor(name, generator) {
    this.name = name;
    this._generator = generator;
    this.active = false;
    this._cleanup = null;
  }

  start() {
    if (this.active) return;
    const gainNode = engine.getChannel(this.name);
    this._cleanup = this._generator(engine.ctx, gainNode);
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    if (this._cleanup) this._cleanup();
    this._cleanup = null;
    this.active = false;
  }

  setVolume(value) {
    engine.setChannelVolume(this.name, value);
  }
}

// === Rain: filtered noise with slow amplitude modulation ===
function createRain(ctx, output) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Bandpass filter to shape rain
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3000;
  bp.Q.value = 0.4;

  // Highpass to remove rumble
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 400;

  // Subtle amplitude modulation for natural feel
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.15;
  const modGain = ctx.createGain();
  modGain.gain.value = 0.85;

  lfo.connect(lfoGain);
  lfoGain.connect(modGain.gain);

  source.connect(bp);
  bp.connect(hp);
  hp.connect(modGain);
  modGain.connect(output);

  source.start();
  lfo.start();

  return () => {
    try { source.stop(); lfo.stop(); } catch (e) {}
  };
}

// === Thunder: low rumble with occasional booms ===
function createThunder(ctx, output) {
  let stopped = false;
  let timeouts = [];

  function boom() {
    if (stopped) return;
    const bufLen = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate rumble: filtered random noise with envelope
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise approximation
      b0 = 0.99 * b0 + white * 0.01;
      b1 = 0.98 * b1 + white * 0.02;
      b2 = 0.97 * b2 + white * 0.03;
      const t = i / bufLen;
      // Envelope: quick attack, slow decay
      const env = t < 0.02 ? t / 0.02 : Math.exp(-3 * (t - 0.02));
      data[i] = (b0 + b1 + b2) * env * 4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 150 + Math.random() * 200;
    lp.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0.6 + Math.random() * 0.4;

    source.connect(lp);
    lp.connect(gain);
    gain.connect(output);
    source.start();

    // Schedule next boom
    const delay = 8000 + Math.random() * 20000;
    timeouts.push(setTimeout(boom, delay));
  }

  // Start with a boom after a short delay
  timeouts.push(setTimeout(boom, 1000 + Math.random() * 3000));

  // Continuous low rumble background
  const rumbleLen = ctx.sampleRate * 4;
  const rumbleBuf = ctx.createBuffer(1, rumbleLen, ctx.sampleRate);
  const rumbleData = rumbleBuf.getChannelData(0);
  let rb = 0;
  for (let i = 0; i < rumbleLen; i++) {
    rb = 0.995 * rb + (Math.random() * 2 - 1) * 0.005;
    rumbleData[i] = rb * 8;
  }
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = rumbleBuf;
  rumbleSource.loop = true;
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = 'lowpass';
  rumbleLp.frequency.value = 80;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.3;
  rumbleSource.connect(rumbleLp);
  rumbleLp.connect(rumbleGain);
  rumbleGain.connect(output);
  rumbleSource.start();

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
    try { rumbleSource.stop(); } catch (e) {}
  };
}

// === Fireplace: crackling + warm low rumble ===
function createFireplace(ctx, output) {
  let stopped = false;
  let timeouts = [];

  // Warm base rumble
  const rumbleLen = ctx.sampleRate * 3;
  const rumbleBuf = ctx.createBuffer(1, rumbleLen, ctx.sampleRate);
  const rumbleData = rumbleBuf.getChannelData(0);
  let rb = 0;
  for (let i = 0; i < rumbleLen; i++) {
    rb = 0.997 * rb + (Math.random() * 2 - 1) * 0.003;
    rumbleData[i] = rb * 6;
  }
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = rumbleBuf;
  rumbleSource.loop = true;
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = 'lowpass';
  rumbleLp.frequency.value = 200;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.4;
  rumbleSource.connect(rumbleLp);
  rumbleLp.connect(rumbleGain);
  rumbleGain.connect(output);
  rumbleSource.start();

  // Crackle scheduler
  function crackle() {
    if (stopped) return;

    const len = Math.floor(ctx.sampleRate * (0.01 + Math.random() * 0.05));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = 1 - (i / len);
      data[i] = (Math.random() * 2 - 1) * env * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000 + Math.random() * 4000;
    const gain = ctx.createGain();
    gain.gain.value = 0.3 + Math.random() * 0.5;

    source.connect(hp);
    hp.connect(gain);
    gain.connect(output);
    source.start();

    const delay = 30 + Math.random() * 200;
    timeouts.push(setTimeout(crackle, delay));
  }

  crackle();

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
    try { rumbleSource.stop(); } catch (e) {}
  };
}

// === Birds: randomized chirps using FM synthesis ===
function createBirds(ctx, output) {
  let stopped = false;
  let timeouts = [];

  function chirp() {
    if (stopped) return;

    const duration = 0.08 + Math.random() * 0.15;
    const baseFreq = 2000 + Math.random() * 3000;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(
      baseFreq * (0.8 + Math.random() * 0.8), now + duration
    );

    // FM modulation for trill
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = 20 + Math.random() * 40;
    const modGain = ctx.createGain();
    modGain.gain.value = baseFreq * 0.02;
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.3, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(env);
    env.connect(output);

    osc.start(now);
    mod.start(now);
    osc.stop(now + duration + 0.01);
    mod.stop(now + duration + 0.01);

    // Sometimes do a double chirp
    if (Math.random() > 0.5) {
      const delay2 = 100 + Math.random() * 150;
      timeouts.push(setTimeout(() => { if (!stopped) chirp(); }, delay2));
    }

    const nextDelay = 800 + Math.random() * 4000;
    timeouts.push(setTimeout(chirp, nextDelay));
  }

  chirp();

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
  };
}

// === Water Drops: resonant sine bursts ===
function createWaterDrops(ctx, output) {
  let stopped = false;
  let timeouts = [];

  function drop() {
    if (stopped) return;
    const now = ctx.currentTime;
    const freq = 800 + Math.random() * 2500;
    const duration = 0.05 + Math.random() * 0.1;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + duration);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 15;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.3, now + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(bp);
    bp.connect(env);
    env.connect(output);

    osc.start(now);
    osc.stop(now + duration + 0.01);

    const nextDelay = 400 + Math.random() * 2500;
    timeouts.push(setTimeout(drop, nextDelay));
  }

  drop();

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
  };
}

// === Wind: slowly modulated filtered noise ===
function createWind(ctx, output) {
  const bufLen = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Bandpass filter with slow LFO modulation
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 600;
  bp.Q.value = 1.5;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain);
  lfoGain.connect(bp.frequency);

  // Second slower modulation for volume swells
  const lfo2 = ctx.createOscillator();
  lfo2.type = 'sine';
  lfo2.frequency.value = 0.04;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.25;
  const volMod = ctx.createGain();
  volMod.gain.value = 0.75;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(volMod.gain);

  source.connect(bp);
  bp.connect(volMod);
  volMod.connect(output);

  source.start();
  lfo.start();
  lfo2.start();

  return () => {
    try { source.stop(); lfo.stop(); lfo2.stop(); } catch (e) {}
  };
}

// === Crickets: rapid oscillating tones at random intervals ===
function createCrickets(ctx, output) {
  let stopped = false;
  let timeouts = [];

  function chirpSequence() {
    if (stopped) return;

    const baseFreq = 4000 + Math.random() * 1500;
    const now = ctx.currentTime;
    const numChirps = 3 + Math.floor(Math.random() * 8);
    const chirpDuration = 0.03;
    const chirpGap = 0.04;

    for (let i = 0; i < numChirps; i++) {
      const t = now + i * (chirpDuration + chirpGap);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq + (Math.random() - 0.5) * 200;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.2 + Math.random() * 0.15, t + 0.005);
      env.gain.setValueAtTime(0.2, t + chirpDuration - 0.005);
      env.gain.linearRampToValueAtTime(0, t + chirpDuration);

      osc.connect(env);
      env.connect(output);
      osc.start(t);
      osc.stop(t + chirpDuration + 0.01);
    }

    const nextDelay = 500 + Math.random() * 3000;
    timeouts.push(setTimeout(chirpSequence, nextDelay));
  }

  chirpSequence();

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
  };
}

// Export foley sound instances
export const foleySounds = {
  rain: new FoleySound('rain', createRain),
  thunder: new FoleySound('thunder', createThunder),
  fireplace: new FoleySound('fireplace', createFireplace),
  birds: new FoleySound('birds', createBirds),
  water: new FoleySound('water', createWaterDrops),
  wind: new FoleySound('wind', createWind),
  crickets: new FoleySound('crickets', createCrickets),
};
