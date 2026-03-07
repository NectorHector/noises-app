// Musical Elements - Pads, Chords (with pitch control), and Piano (warm, dark, with delay/reverb)
import { engine } from './engine.js';

// Note frequencies (octave 3 and 4)
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
  D5: 587.33, E5: 659.25,
};

const MOODS = {
  calm: {
    chords: [
      [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],
      [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
      [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.F4],
      [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4],
    ],
    scale: [NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5],
  },
  dreamy: {
    chords: [
      [NOTES.D3, NOTES.A3, NOTES.E4, NOTES.G4],
      [NOTES.F3, NOTES.C4, NOTES.E4, NOTES.A4],
      [NOTES.G3, NOTES.D4, NOTES.B4],
      [NOTES.C3, NOTES.G3, NOTES.D4, NOTES.E4],
    ],
    scale: [NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.B4, NOTES.D5],
  },
  melancholy: {
    chords: [
      [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4],
      [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4],
      [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],
      [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
    ],
    scale: [NOTES.A3, NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4],
  },
};

let currentMood = 'calm';
// Pitch offset in semitones: -6 to +6 (one octave range)
let pitchOffset = 0;

function applyPitch(freq) {
  return freq * Math.pow(2, pitchOffset / 12);
}

// Helper: create reverb impulse response
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

// === Pad Synth ===
class PadSynth {
  constructor() {
    this.active = false;
    this.oscillators = [];
    this.gainNode = null;
    this.filterNode = null;
    this.lfo = null;
  }

  start() {
    if (this.active) return;
    const ctx = engine.ctx;
    this.gainNode = engine.getChannel('pad');

    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 800;
    this.filterNode.Q.value = 1;
    this.filterNode.connect(this.gainNode);

    this.lfo = ctx.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filterNode.frequency);
    this._lfoGain = lfoGain;
    this.lfo.start();

    const chord = MOODS[currentMood].chords[0];
    this._buildChord(chord);
    this.active = true;
  }

  _buildChord(freqs) {
    const ctx = engine.ctx;
    const now = ctx.currentTime;

    this.oscillators.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, now, 1.5);
      setTimeout(() => { try { osc.stop(); } catch {} }, 5000);
    });
    this.oscillators = [];

    freqs.forEach(freq => {
      const pitched = applyPitch(freq);
      [-4, 4].forEach(detune => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = pitched;
        osc.detune.value = detune;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.setTargetAtTime(0.06, now, 2);
        osc.connect(gain);
        gain.connect(this.filterNode);
        osc.start();
        this.oscillators.push({ osc, gain });
      });
    });
  }

  stop() {
    if (!this.active) return;
    const now = engine.currentTime;
    this.oscillators.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, now, 0.5);
      setTimeout(() => { try { osc.stop(); } catch {} }, 3000);
    });
    try { this.lfo.stop(); } catch {}
    this.oscillators = [];
    this.active = false;
  }

  setMood(mood) {
    if (!this.active) return;
    this._buildChord(MOODS[mood].chords[0]);
  }

  setPitch() {
    if (!this.active) return;
    this._buildChord(MOODS[currentMood].chords[0]);
  }

  setVolume(value) {
    engine.setChannelVolume('pad', value);
  }
}

// === Chord Progression (with pitch offset) ===
class ChordProgression {
  constructor() {
    this.active = false;
    this.gainNode = null;
    this.filterNode = null;
    this._chordIndex = 0;
    this._interval = null;
    this._oscillators = [];
  }

  start() {
    if (this.active) return;
    const ctx = engine.ctx;
    this.gainNode = engine.getChannel('chords');

    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 1200;
    this.filterNode.Q.value = 0.5;
    this.filterNode.connect(this.gainNode);

    this._chordIndex = 0;
    this._playNextChord();
    this._interval = setInterval(() => this._playNextChord(), 25000);
    this.active = true;
  }

  _playNextChord() {
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    const mood = MOODS[currentMood];
    const chord = mood.chords[this._chordIndex % mood.chords.length];
    this._chordIndex++;

    this._oscillators.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, now, 2);
      setTimeout(() => { try { osc.stop(); } catch {} }, 8000);
    });
    this._oscillators = [];

    chord.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = applyPitch(freq);
      osc.detune.value = (Math.random() - 0.5) * 6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.setTargetAtTime(0.07, now, 3);
      osc.connect(gain);
      gain.connect(this.filterNode);
      osc.start();
      this._oscillators.push({ osc, gain });
    });
  }

  stop() {
    if (!this.active) return;
    clearInterval(this._interval);
    const now = engine.currentTime;
    this._oscillators.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, now, 0.3);
      setTimeout(() => { try { osc.stop(); } catch {} }, 2000);
    });
    this._oscillators = [];
    this.active = false;
  }

  setMood() {}

  setPitch() {
    // Next chord will pick up the new pitch
  }

  setVolume(value) {
    engine.setChannelVolume('chords', value);
  }
}

// === Generative Piano: warm dark timbre with delay + reverb ===
class GenerativePiano {
  constructor() {
    this.active = false;
    this.gainNode = null;
    this._timeout = null;
    this._stopped = false;
    this._reverb = null;
    this._delay = null;
    this._delayFeedback = null;
    this._reverbGain = null;
    this._delayGain = null;
    this._dryGain = null;
  }

  start() {
    if (this.active) return;
    const ctx = engine.ctx;
    this.gainNode = engine.getChannel('piano');

    // Build effects chain: dry + delay + reverb all mixed to output
    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 0.5;
    this._dryGain.connect(this.gainNode);

    // Delay (ping-pong feel via stereo)
    this._delay = ctx.createDelay(2.0);
    this._delay.delayTime.value = 0.6;
    this._delayFeedback = ctx.createGain();
    this._delayFeedback.gain.value = 0.35;
    this._delay.connect(this._delayFeedback);
    this._delayFeedback.connect(this._delay); // feedback loop
    this._delayGain = ctx.createGain();
    this._delayGain.gain.value = 0.3;
    this._delay.connect(this._delayGain);
    // Darken the delay repeats
    this._delayFilter = ctx.createBiquadFilter();
    this._delayFilter.type = 'lowpass';
    this._delayFilter.frequency.value = 1200;
    this._delayGain.connect(this._delayFilter);
    this._delayFilter.connect(this.gainNode);

    // Convolution reverb (long, dark)
    this._reverb = ctx.createConvolver();
    this._reverb.buffer = makeReverbIR(ctx, 3.5, 1.2);
    this._reverbGain = ctx.createGain();
    this._reverbGain.gain.value = 0.4;
    this._reverb.connect(this._reverbGain);
    // Dark reverb filter
    this._reverbFilter = ctx.createBiquadFilter();
    this._reverbFilter.type = 'lowpass';
    this._reverbFilter.frequency.value = 900;
    this._reverbGain.connect(this._reverbFilter);
    this._reverbFilter.connect(this.gainNode);

    this._stopped = false;
    this._scheduleNote();
    this.active = true;
  }

  _scheduleNote() {
    if (this._stopped) return;
    this._playNote();
    const delay = 3000 + Math.random() * 7000;
    this._timeout = setTimeout(() => this._scheduleNote(), delay);
  }

  _playNote() {
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    const scale = MOODS[currentMood].scale;
    const baseFreq = scale[Math.floor(Math.random() * scale.length)];
    const freq = applyPitch(baseFreq);

    // Karplus-Strong with extra damping for dark/warm timbre
    const duration = 4 + Math.random() * 3;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.round(sampleRate / freq);
    const totalSamples = Math.round(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Initialize with shaped noise (less high-freq content = warmer)
    const pluck = new Float32Array(bufferSize);
    let prev = 0;
    for (let i = 0; i < bufferSize; i++) {
      const raw = Math.random() * 2 - 1;
      // Pre-filter the excitation for warmth
      pluck[i] = prev * 0.6 + raw * 0.4;
      prev = pluck[i];
    }

    // Karplus-Strong with heavier damping (0.496 instead of 0.498)
    let idx = 0;
    for (let i = 0; i < totalSamples; i++) {
      data[i] = pluck[idx];
      const next = (idx + 1) % bufferSize;
      pluck[idx] = (pluck[idx] + pluck[next]) * 0.496;
      idx = next;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Very dark low-pass: warm timbre
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800 + Math.random() * 400;
    lp.Q.value = 0.3;

    const gain = ctx.createGain();
    const velocity = 0.12 + Math.random() * 0.1;
    gain.gain.setValueAtTime(0, now);
    // Soft attack
    gain.gain.linearRampToValueAtTime(velocity, now + 0.01);
    // Long natural release
    gain.gain.setTargetAtTime(0, now + 0.5, duration * 0.3);

    source.connect(lp);
    lp.connect(gain);
    // Send to dry, delay, and reverb
    gain.connect(this._dryGain);
    gain.connect(this._delay);
    gain.connect(this._reverb);

    source.start(now);
    source.stop(now + duration + 0.5);

    // Occasionally play a gentle second note
    if (Math.random() > 0.6) {
      const gap = 0.2 + Math.random() * 0.4;
      setTimeout(() => {
        if (!this._stopped) {
          const f2 = applyPitch(scale[Math.floor(Math.random() * scale.length)]);
          this._playSingleNote(f2, 0.06 + Math.random() * 0.06);
        }
      }, gap * 1000);
    }
  }

  _playSingleNote(freq, velocity) {
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    const duration = 3 + Math.random() * 2;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.round(sampleRate / freq);
    const totalSamples = Math.round(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const pluck = new Float32Array(bufferSize);
    let prev = 0;
    for (let i = 0; i < bufferSize; i++) {
      const raw = Math.random() * 2 - 1;
      pluck[i] = prev * 0.6 + raw * 0.4;
      prev = pluck[i];
    }

    let idx = 0;
    for (let i = 0; i < totalSamples; i++) {
      data[i] = pluck[idx];
      const next = (idx + 1) % bufferSize;
      pluck[idx] = (pluck[idx] + pluck[next]) * 0.496;
      idx = next;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700 + Math.random() * 300;
    lp.Q.value = 0.3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity, now + 0.01);
    gain.gain.setTargetAtTime(0, now + 0.3, duration * 0.3);
    source.connect(lp);
    lp.connect(gain);
    gain.connect(this._dryGain);
    gain.connect(this._delay);
    gain.connect(this._reverb);
    source.start(now);
    source.stop(now + duration + 0.5);
  }

  stop() {
    if (!this.active) return;
    this._stopped = true;
    clearTimeout(this._timeout);
    this.active = false;
  }

  setMood() {}

  setPitch() {}

  setVolume(value) {
    engine.setChannelVolume('piano', value);
  }
}

export const pad = new PadSynth();
export const chords = new ChordProgression();
export const piano = new GenerativePiano();

export function setMood(mood) {
  currentMood = mood;
  pad.setMood(mood);
  chords.setMood(mood);
  piano.setMood();
}

export function setPitchOffset(semitones) {
  pitchOffset = semitones;
  pad.setPitch();
  chords.setPitch();
  piano.setPitch();
}

export function getPitchOffset() {
  return pitchOffset;
}

export function getMood() {
  return currentMood;
}
