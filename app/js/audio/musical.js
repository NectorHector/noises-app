// Musical Elements - Pads, Chords, and Piano
import { engine } from './engine.js';

// Note frequencies (octave 3 and 4)
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
  D5: 587.33, E5: 659.25,
};

// Chord voicings for different moods
const MOODS = {
  calm: {
    chords: [
      [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],     // Cmaj7/9
      [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],                 // Fmaj7
      [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.F4],                 // G7
      [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4],                 // Am7
    ],
    scale: [NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5], // C pentatonic
  },
  dreamy: {
    chords: [
      [NOTES.D3, NOTES.A3, NOTES.E4, NOTES.G4],                 // Dsus4
      [NOTES.F3, NOTES.C4, NOTES.E4, NOTES.A4],                 // Fmaj7/9
      [NOTES.G3, NOTES.D4, NOTES.B4],                            // G/B
      [NOTES.C3, NOTES.G3, NOTES.D4, NOTES.E4],                 // Csus2/9
    ],
    scale: [NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.B4, NOTES.D5],
  },
  melancholy: {
    chords: [
      [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4],                 // Am7
      [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4],                 // Dm7
      [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],                 // Em7
      [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],                 // Fmaj7
    ],
    scale: [NOTES.A3, NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4], // A minor pentatonic
  },
};

let currentMood = 'calm';

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

    // LFO on filter cutoff
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filterNode.frequency);
    this._lfoGain = lfoGain;
    this.lfo.start();

    // Create pad oscillators - multiple detuned layers
    const chord = MOODS[currentMood].chords[0];
    this._buildChord(chord);
    this.active = true;
  }

  _buildChord(freqs) {
    const ctx = engine.ctx;
    const now = ctx.currentTime;

    // Fade out old oscillators
    this.oscillators.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, now, 1.5);
      setTimeout(() => { try { osc.stop(); } catch (e) {} }, 5000);
    });
    this.oscillators = [];

    freqs.forEach(freq => {
      // Two detuned oscillators per note for richness
      [-4, 4].forEach(detune => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.setTargetAtTime(0.06, now, 2); // slow attack

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
      setTimeout(() => { try { osc.stop(); } catch (e) {} }, 3000);
    });
    try { this.lfo.stop(); } catch (e) {}
    this.oscillators = [];
    this.active = false;
  }

  setMood(mood) {
    if (!this.active) return;
    const chord = MOODS[mood].chords[0];
    this._buildChord(chord);
  }

  setVolume(value) {
    engine.setChannelVolume('pad', value);
  }
}

// === Chord Progression ===
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

    // Fade out old
    this._oscillators.forEach(({ osc, gain }) => {
      gain.gain.setTargetAtTime(0, now, 2);
      setTimeout(() => { try { osc.stop(); } catch (e) {} }, 8000);
    });
    this._oscillators = [];

    // Build new chord with slow fade in
    chord.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // Slight random detune for warmth
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
      setTimeout(() => { try { osc.stop(); } catch (e) {} }, 2000);
    });
    this._oscillators = [];
    this.active = false;
  }

  setMood() {
    // Next chord will pick up the new mood automatically
  }

  setVolume(value) {
    engine.setChannelVolume('chords', value);
  }
}

// === Generative Piano ===
class GenerativePiano {
  constructor() {
    this.active = false;
    this.gainNode = null;
    this._timeout = null;
    this._stopped = false;
  }

  start() {
    if (this.active) return;
    this.gainNode = engine.getChannel('piano');
    this._stopped = false;
    this._scheduleNote();
    this.active = true;
  }

  _scheduleNote() {
    if (this._stopped) return;
    this._playNote();
    const delay = 2000 + Math.random() * 6000;
    this._timeout = setTimeout(() => this._scheduleNote(), delay);
  }

  _playNote() {
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    const scale = MOODS[currentMood].scale;
    const freq = scale[Math.floor(Math.random() * scale.length)];

    // Karplus-Strong inspired piano synthesis
    const duration = 2 + Math.random() * 2;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.round(sampleRate / freq);
    const totalSamples = Math.round(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Initialize with noise burst
    const pluck = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      pluck[i] = Math.random() * 2 - 1;
    }

    // Karplus-Strong loop
    let idx = 0;
    for (let i = 0; i < totalSamples; i++) {
      data[i] = pluck[idx];
      // Low-pass filter: average current and next sample
      const next = (idx + 1) % bufferSize;
      pluck[idx] = (pluck[idx] + pluck[next]) * 0.498;
      idx = next;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    const velocity = 0.15 + Math.random() * 0.15;
    gain.gain.setValueAtTime(velocity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Gentle low-pass to soften the attack
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000 + Math.random() * 1000;

    source.connect(lp);
    lp.connect(gain);
    gain.connect(this.gainNode);
    source.start(now);
    source.stop(now + duration + 0.1);

    // Occasionally play a second note (interval)
    if (Math.random() > 0.65) {
      const delay = 0.15 + Math.random() * 0.3;
      setTimeout(() => {
        if (!this._stopped) {
          const freq2 = scale[Math.floor(Math.random() * scale.length)];
          this._playSingleNote(freq2, 0.1 + Math.random() * 0.1);
        }
      }, delay * 1000);
    }
  }

  _playSingleNote(freq, velocity) {
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    const duration = 1.5 + Math.random() * 1.5;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.round(sampleRate / freq);
    const totalSamples = Math.round(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const pluck = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      pluck[i] = Math.random() * 2 - 1;
    }

    let idx = 0;
    for (let i = 0; i < totalSamples; i++) {
      data[i] = pluck[idx];
      const next = (idx + 1) % bufferSize;
      pluck[idx] = (pluck[idx] + pluck[next]) * 0.498;
      idx = next;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    source.connect(lp);
    lp.connect(gain);
    gain.connect(this.gainNode);
    source.start(now);
    source.stop(now + duration + 0.1);
  }

  stop() {
    if (!this.active) return;
    this._stopped = true;
    clearTimeout(this._timeout);
    this.active = false;
  }

  setMood() {
    // Next note will use the new mood's scale
  }

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

export function getMood() {
  return currentMood;
}
