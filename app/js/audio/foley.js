// Foley Sound Module - high-quality procedural nature sounds (ASMR grade)
import { engine } from './engine.js';

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

// Helper: create a long stereo noise buffer with independent channels
function makeNoiseBuffer(ctx, seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

// Helper: create a convolution reverb impulse response
function makeReverbIR(ctx, duration, decay) {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
    }
  }
  return buf;
}

// === RAIN: Multi-layered, full spectrum, stereo, slowly modulated ===
function createRain(ctx, output) {
  const nodes = [];

  // Layer 1: Distant rain wash (low-mid, wide stereo)
  const buf1 = makeNoiseBuffer(ctx, 8);
  const src1 = ctx.createBufferSource();
  src1.buffer = buf1; src1.loop = true;
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 1200; bp1.Q.value = 0.3;
  const g1 = ctx.createGain(); g1.gain.value = 0.5;
  const lfo1 = ctx.createOscillator(); lfo1.type = 'sine'; lfo1.frequency.value = 0.07;
  const lfoG1 = ctx.createGain(); lfoG1.gain.value = 0.08;
  const mod1 = ctx.createGain(); mod1.gain.value = 0.92;
  lfo1.connect(lfoG1); lfoG1.connect(mod1.gain);
  src1.connect(bp1); bp1.connect(mod1); mod1.connect(g1); g1.connect(output);
  src1.start(); lfo1.start();
  nodes.push(src1, lfo1);

  // Layer 2: Mid-frequency rain detail (the "shhh" texture)
  const buf2 = makeNoiseBuffer(ctx, 6);
  const src2 = ctx.createBufferSource();
  src2.buffer = buf2; src2.loop = true;
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass'; bp2.frequency.value = 4000; bp2.Q.value = 0.5;
  const hp2 = ctx.createBiquadFilter();
  hp2.type = 'highpass'; hp2.frequency.value = 2000;
  const g2 = ctx.createGain(); g2.gain.value = 0.25;
  const lfo2 = ctx.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 0.12;
  const lfoG2 = ctx.createGain(); lfoG2.gain.value = 0.06;
  const mod2 = ctx.createGain(); mod2.gain.value = 0.94;
  lfo2.connect(lfoG2); lfoG2.connect(mod2.gain);
  src2.connect(bp2); bp2.connect(hp2); hp2.connect(mod2); mod2.connect(g2); g2.connect(output);
  src2.start(); lfo2.start();
  nodes.push(src2, lfo2);

  // Layer 3: High-frequency sparkle (individual drop texture)
  const buf3 = makeNoiseBuffer(ctx, 5);
  const src3 = ctx.createBufferSource();
  src3.buffer = buf3; src3.loop = true;
  const hp3 = ctx.createBiquadFilter();
  hp3.type = 'highpass'; hp3.frequency.value = 6000;
  const g3 = ctx.createGain(); g3.gain.value = 0.12;
  const lfo3 = ctx.createOscillator(); lfo3.type = 'sine'; lfo3.frequency.value = 0.19;
  const lfoG3 = ctx.createGain(); lfoG3.gain.value = 0.05;
  const mod3 = ctx.createGain(); mod3.gain.value = 0.95;
  lfo3.connect(lfoG3); lfoG3.connect(mod3.gain);
  src3.connect(hp3); hp3.connect(mod3); mod3.connect(g3); g3.connect(output);
  src3.start(); lfo3.start();
  nodes.push(src3, lfo3);

  // Layer 4: Sub-bass rumble (rain on roof feeling)
  const buf4 = makeNoiseBuffer(ctx, 10);
  const src4 = ctx.createBufferSource();
  src4.buffer = buf4; src4.loop = true;
  const lp4 = ctx.createBiquadFilter();
  lp4.type = 'lowpass'; lp4.frequency.value = 200; lp4.Q.value = 0.1;
  const g4 = ctx.createGain(); g4.gain.value = 0.2;
  src4.connect(lp4); lp4.connect(g4); g4.connect(output);
  src4.start();
  nodes.push(src4);

  return () => { nodes.forEach(n => { try { n.stop(); } catch {} }); };
}

// === THUNDER: kept as-is (user specified keep synthetic thunder) ===
function createThunder(ctx, output) {
  let stopped = false;
  let timeouts = [];

  function boom() {
    if (stopped) return;
    const bufLen = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.01;
      b1 = 0.98 * b1 + white * 0.02;
      b2 = 0.97 * b2 + white * 0.03;
      const t = i / bufLen;
      const env = t < 0.02 ? t / 0.02 : Math.exp(-3 * (t - 0.02));
      data[i] = (b0 + b1 + b2) * env * 4;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 150 + Math.random() * 200; lp.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.6 + Math.random() * 0.4;
    source.connect(lp); lp.connect(gain); gain.connect(output);
    source.start();
    timeouts.push(setTimeout(boom, 8000 + Math.random() * 20000));
  }
  timeouts.push(setTimeout(boom, 1000 + Math.random() * 3000));

  const rumbleLen = ctx.sampleRate * 4;
  const rumbleBuf = ctx.createBuffer(1, rumbleLen, ctx.sampleRate);
  const rumbleData = rumbleBuf.getChannelData(0);
  let rb = 0;
  for (let i = 0; i < rumbleLen; i++) {
    rb = 0.995 * rb + (Math.random() * 2 - 1) * 0.005;
    rumbleData[i] = rb * 8;
  }
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = rumbleBuf; rumbleSource.loop = true;
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = 'lowpass'; rumbleLp.frequency.value = 80;
  const rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0.3;
  rumbleSource.connect(rumbleLp); rumbleLp.connect(rumbleGain); rumbleGain.connect(output);
  rumbleSource.start();

  return () => { stopped = true; timeouts.forEach(clearTimeout); try { rumbleSource.stop(); } catch {} };
}

// === FIREPLACE: layered crackle + warm body + pop events ===
function createFireplace(ctx, output) {
  let stopped = false;
  let timeouts = [];
  const nodes = [];

  // Deep warm body
  const bodyBuf = makeNoiseBuffer(ctx, 6);
  const bodySrc = ctx.createBufferSource();
  bodySrc.buffer = bodyBuf; bodySrc.loop = true;
  const bodyLp = ctx.createBiquadFilter();
  bodyLp.type = 'lowpass'; bodyLp.frequency.value = 250; bodyLp.Q.value = 0.1;
  const bodyG = ctx.createGain(); bodyG.gain.value = 0.35;
  const bodyLfo = ctx.createOscillator(); bodyLfo.type = 'sine'; bodyLfo.frequency.value = 0.06;
  const bodyLfoG = ctx.createGain(); bodyLfoG.gain.value = 0.08;
  const bodyMod = ctx.createGain(); bodyMod.gain.value = 0.92;
  bodyLfo.connect(bodyLfoG); bodyLfoG.connect(bodyMod.gain);
  bodySrc.connect(bodyLp); bodyLp.connect(bodyMod); bodyMod.connect(bodyG); bodyG.connect(output);
  bodySrc.start(); bodyLfo.start();
  nodes.push(bodySrc, bodyLfo);

  // Mid-range ember hiss
  const emberBuf = makeNoiseBuffer(ctx, 5);
  const emberSrc = ctx.createBufferSource();
  emberSrc.buffer = emberBuf; emberSrc.loop = true;
  const emberBp = ctx.createBiquadFilter();
  emberBp.type = 'bandpass'; emberBp.frequency.value = 800; emberBp.Q.value = 0.8;
  const emberG = ctx.createGain(); emberG.gain.value = 0.12;
  emberSrc.connect(emberBp); emberBp.connect(emberG); emberG.connect(output);
  emberSrc.start();
  nodes.push(emberSrc);

  // Crackle events
  function crackle() {
    if (stopped) return;
    const numPops = 1 + Math.floor(Math.random() * 4);
    for (let p = 0; p < numPops; p++) {
      const delay = p * (10 + Math.random() * 30);
      setTimeout(() => {
        if (stopped) return;
        const len = Math.floor(ctx.sampleRate * (0.003 + Math.random() * 0.02));
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = buf.getChannelData(ch);
          for (let i = 0; i < len; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i / len), 3);
          }
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 3000 + Math.random() * 5000;
        const g = ctx.createGain(); g.gain.value = 0.2 + Math.random() * 0.4;
        src.connect(hp); hp.connect(g); g.connect(output);
        src.start();
      }, delay);
    }
    timeouts.push(setTimeout(crackle, 40 + Math.random() * 250));
  }
  crackle();

  // Deep pops (wood shifting)
  function deepPop() {
    if (stopped) return;
    const len = Math.floor(ctx.sampleRate * (0.02 + Math.random() * 0.04));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i / len), 2);
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 400 + Math.random() * 600; bp.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = 0.25 + Math.random() * 0.3;
    src.connect(bp); bp.connect(g); g.connect(output);
    src.start();
    timeouts.push(setTimeout(deepPop, 2000 + Math.random() * 8000));
  }
  timeouts.push(setTimeout(deepPop, 500 + Math.random() * 2000));

  return () => { stopped = true; timeouts.forEach(clearTimeout); nodes.forEach(n => { try { n.stop(); } catch {} }); };
}

// === BIRDS: realistic multi-species birdsong with FM synthesis ===
function createBirds(ctx, output) {
  let stopped = false;
  let timeouts = [];
  const nodes = [];

  // Ambient forest air
  const ambBuf = makeNoiseBuffer(ctx, 8);
  const ambSrc = ctx.createBufferSource();
  ambSrc.buffer = ambBuf; ambSrc.loop = true;
  const ambBp = ctx.createBiquadFilter();
  ambBp.type = 'bandpass'; ambBp.frequency.value = 5000; ambBp.Q.value = 0.3;
  const ambG = ctx.createGain(); ambG.gain.value = 0.03;
  ambSrc.connect(ambBp); ambBp.connect(ambG); ambG.connect(output);
  ambSrc.start();
  nodes.push(ambSrc);

  // Warbler (rapid descending trill)
  function warbler() {
    if (stopped) return;
    const now = ctx.currentTime;
    const numNotes = 3 + Math.floor(Math.random() * 5);
    let t = now;
    for (let i = 0; i < numNotes; i++) {
      const dur = 0.04 + Math.random() * 0.06;
      const freq = 3500 + Math.random() * 2000 - i * 150;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * (0.85 + Math.random() * 0.3), t + dur);
      const mod = ctx.createOscillator(); mod.type = 'sine';
      mod.frequency.value = 25 + Math.random() * 30;
      const modG = ctx.createGain(); modG.gain.value = freq * 0.015;
      mod.connect(modG); modG.connect(osc.frequency);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.18 + Math.random() * 0.12, t + 0.005);
      env.gain.setValueAtTime(0.18, t + dur * 0.5);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(env); env.connect(output);
      osc.start(t); mod.start(t);
      osc.stop(t + dur + 0.01); mod.stop(t + dur + 0.01);
      t += dur + 0.01 + Math.random() * 0.02;
    }
    timeouts.push(setTimeout(warbler, 3000 + Math.random() * 8000));
  }

  // Robin (two-note whistle)
  function robin() {
    if (stopped) return;
    const now = ctx.currentTime;
    let t = now;
    const f1 = 2200 + Math.random() * 800;
    const f2 = f1 * (1.1 + Math.random() * 0.3);
    [f1, f2].forEach(freq => {
      const dur = 0.12 + Math.random() * 0.08;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * (0.95 + Math.random() * 0.1), t + dur);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.2, t + 0.008);
      env.gain.setValueAtTime(0.18, t + dur * 0.7);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(env); env.connect(output);
      osc.start(t); osc.stop(t + dur + 0.01);
      t += dur + 0.03;
    });
    timeouts.push(setTimeout(robin, 5000 + Math.random() * 12000));
  }

  // Distant cuckoo
  function cuckoo() {
    if (stopped) return;
    const now = ctx.currentTime;
    const f1 = 900 + Math.random() * 200;
    [f1, f1 * 0.8].forEach((freq, i) => {
      const t = now + i * 0.4;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.1, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(env); env.connect(output);
      osc.start(t); osc.stop(t + 0.31);
    });
    timeouts.push(setTimeout(cuckoo, 12000 + Math.random() * 25000));
  }

  warbler();
  timeouts.push(setTimeout(robin, 2000 + Math.random() * 4000));
  timeouts.push(setTimeout(cuckoo, 5000 + Math.random() * 10000));

  return () => { stopped = true; timeouts.forEach(clearTimeout); nodes.forEach(n => { try { n.stop(); } catch {} }); };
}

// === WATER DROPS: resonant sine bursts with reverb tail ===
function createWaterDrops(ctx, output) {
  let stopped = false;
  let timeouts = [];

  const reverb = ctx.createConvolver();
  reverb.buffer = makeReverbIR(ctx, 1.5, 0.4);
  const reverbGain = ctx.createGain(); reverbGain.gain.value = 0.35;
  reverb.connect(reverbGain); reverbGain.connect(output);
  const dryGain = ctx.createGain(); dryGain.gain.value = 0.7;
  dryGain.connect(output);

  function drop() {
    if (stopped) return;
    const now = ctx.currentTime;
    const freq = 1000 + Math.random() * 3000;
    const duration = 0.04 + Math.random() * 0.08;
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq * 0.8; bp.Q.value = 20;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.2, now + 0.002);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(bp); bp.connect(env);
    env.connect(dryGain); env.connect(reverb);
    osc.start(now); osc.stop(now + duration + 0.01);
    if (Math.random() > 0.7) {
      timeouts.push(setTimeout(() => { if (!stopped) drop(); }, 80 + Math.random() * 150));
    }
    timeouts.push(setTimeout(drop, 500 + Math.random() * 3000));
  }
  drop();

  return () => { stopped = true; timeouts.forEach(clearTimeout); };
}

// === WIND: multi-band filtered noise with slow organic modulation ===
function createWind(ctx, output) {
  const nodes = [];

  // Low wind (deep whoosh)
  const buf1 = makeNoiseBuffer(ctx, 8);
  const src1 = ctx.createBufferSource();
  src1.buffer = buf1; src1.loop = true;
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 300; bp1.Q.value = 0.8;
  const lfo1 = ctx.createOscillator(); lfo1.type = 'sine'; lfo1.frequency.value = 0.04;
  const lfoG1 = ctx.createGain(); lfoG1.gain.value = 150;
  lfo1.connect(lfoG1); lfoG1.connect(bp1.frequency);
  const lfo1b = ctx.createOscillator(); lfo1b.type = 'sine'; lfo1b.frequency.value = 0.025;
  const lfoG1b = ctx.createGain(); lfoG1b.gain.value = 0.2;
  const mod1 = ctx.createGain(); mod1.gain.value = 0.6;
  lfo1b.connect(lfoG1b); lfoG1b.connect(mod1.gain);
  const g1 = ctx.createGain(); g1.gain.value = 0.4;
  src1.connect(bp1); bp1.connect(mod1); mod1.connect(g1); g1.connect(output);
  src1.start(); lfo1.start(); lfo1b.start();
  nodes.push(src1, lfo1, lfo1b);

  // High wind (breathy whistle)
  const buf2 = makeNoiseBuffer(ctx, 6);
  const src2 = ctx.createBufferSource();
  src2.buffer = buf2; src2.loop = true;
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass'; bp2.frequency.value = 2000; bp2.Q.value = 1.2;
  const lfo2 = ctx.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 0.07;
  const lfoG2 = ctx.createGain(); lfoG2.gain.value = 800;
  lfo2.connect(lfoG2); lfoG2.connect(bp2.frequency);
  const lfo2b = ctx.createOscillator(); lfo2b.type = 'sine'; lfo2b.frequency.value = 0.03;
  const lfoG2b = ctx.createGain(); lfoG2b.gain.value = 0.15;
  const mod2 = ctx.createGain(); mod2.gain.value = 0.5;
  lfo2b.connect(lfoG2b); lfoG2b.connect(mod2.gain);
  const g2 = ctx.createGain(); g2.gain.value = 0.15;
  src2.connect(bp2); bp2.connect(mod2); mod2.connect(g2); g2.connect(output);
  src2.start(); lfo2.start(); lfo2b.start();
  nodes.push(src2, lfo2, lfo2b);

  // Gusts
  const buf3 = makeNoiseBuffer(ctx, 10);
  const src3 = ctx.createBufferSource();
  src3.buffer = buf3; src3.loop = true;
  const bp3 = ctx.createBiquadFilter();
  bp3.type = 'bandpass'; bp3.frequency.value = 600; bp3.Q.value = 0.4;
  const lfo3 = ctx.createOscillator(); lfo3.type = 'sine'; lfo3.frequency.value = 0.015;
  const lfoG3 = ctx.createGain(); lfoG3.gain.value = 0.35;
  const mod3 = ctx.createGain(); mod3.gain.value = 0.1;
  lfo3.connect(lfoG3); lfoG3.connect(mod3.gain);
  const g3 = ctx.createGain(); g3.gain.value = 0.3;
  src3.connect(bp3); bp3.connect(mod3); mod3.connect(g3); g3.connect(output);
  src3.start(); lfo3.start();
  nodes.push(src3, lfo3);

  return () => { nodes.forEach(n => { try { n.stop(); } catch {} }); };
}

// === CRICKETS: realistic stridulation with multiple individuals ===
function createCrickets(ctx, output) {
  let stopped = false;
  let timeouts = [];
  const numCrickets = 3 + Math.floor(Math.random() * 2);

  for (let c = 0; c < numCrickets; c++) {
    const baseFreq = 4200 + (c * 400) + Math.random() * 300;
    const chirpRate = 12 + Math.random() * 8;
    const pan = (c / (numCrickets - 1)) * 2 - 1;

    function trill() {
      if (stopped) return;
      const now = ctx.currentTime;
      const numChirps = 4 + Math.floor(Math.random() * 12);
      const chirpDur = 0.025 + Math.random() * 0.01;
      const gap = 1 / chirpRate;
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan + (Math.random() - 0.5) * 0.2;

      for (let i = 0; i < numChirps; i++) {
        const t = now + i * gap;
        const osc = ctx.createOscillator(); osc.type = 'sine';
        osc.frequency.value = baseFreq + (Math.random() - 0.5) * 100;
        const osc2 = ctx.createOscillator(); osc2.type = 'sine';
        osc2.frequency.value = baseFreq * 2 + (Math.random() - 0.5) * 50;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.05, t + 0.003);
        env.gain.setValueAtTime(0.08, t + chirpDur * 0.7);
        env.gain.linearRampToValueAtTime(0, t + chirpDur);
        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0, t);
        env2.gain.linearRampToValueAtTime(0.03, t + 0.003);
        env2.gain.linearRampToValueAtTime(0, t + chirpDur);
        osc.connect(env); env.connect(panner);
        osc2.connect(env2); env2.connect(panner);
        panner.connect(output);
        osc.start(t); osc.stop(t + chirpDur + 0.01);
        osc2.start(t); osc2.stop(t + chirpDur + 0.01);
      }
      timeouts.push(setTimeout(trill, 800 + Math.random() * 4000));
    }
    timeouts.push(setTimeout(trill, c * 500 + Math.random() * 2000));
  }

  return () => { stopped = true; timeouts.forEach(clearTimeout); };
}

export const foleySounds = {
  rain: new FoleySound('rain', createRain),
  thunder: new FoleySound('thunder', createThunder),
  fireplace: new FoleySound('fireplace', createFireplace),
  birds: new FoleySound('birds', createBirds),
  water: new FoleySound('water', createWaterDrops),
  wind: new FoleySound('wind', createWind),
  crickets: new FoleySound('crickets', createCrickets),
};
