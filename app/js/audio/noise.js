// Colored Noise Generator with filter and chorus effect
import { engine } from './engine.js';

const NUM_CHORUS_VOICES = 3;

class NoiseGenerator {
  constructor() {
    this.sourceNode = null;
    this.filter = null;
    this.gainNode = null;
    this.noiseBuffer = null;
    this.active = false;
    this.chorusActive = false;
    this.colorValue = 50;
    this.chorusDepth = 0.5;
    this.chorusRate = 0.25;
    // Chorus internals
    this._chorusDelays = [];
    this._chorusLFOs = [];
    this._chorusLFOGains = [];
    this._chorusWetGain = null;
    this._dryGain = null;
  }

  _createNoiseBuffer() {
    const ctx = engine.ctx;
    const sr = ctx.sampleRate;
    const length = sr * 6; // 6 seconds for smoother looping
    const buffer = ctx.createBuffer(2, length, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  start() {
    if (this.active) return;
    const ctx = engine.ctx;
    this.gainNode = engine.getChannel('noise');

    if (!this.noiseBuffer) {
      this.noiseBuffer = this._createNoiseBuffer();
    }

    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.noiseBuffer;
    this.sourceNode.loop = true;

    // Filter with very low resonance
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.1; // Minimal resonance
    this._applyColor(this.colorValue);

    // Dry path
    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 1;

    // Chorus: multiple delayed copies with LFO-modulated delay times
    this._chorusWetGain = ctx.createGain();
    this._chorusWetGain.gain.value = this.chorusActive ? 0.5 : 0;

    this._chorusDelays = [];
    this._chorusLFOs = [];
    this._chorusLFOGains = [];

    for (let i = 0; i < NUM_CHORUS_VOICES; i++) {
      const delay = ctx.createDelay(0.05);
      // Stagger base delay times for each voice
      delay.delayTime.value = 0.015 + i * 0.008;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      // Slightly different rates per voice for richness
      lfo.frequency.value = this.chorusRate * (0.8 + i * 0.3);

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = this.chorusDepth * 0.004;

      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);

      // Each voice has its own gain for even mix
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1 / NUM_CHORUS_VOICES;

      this.filter.connect(delay);
      delay.connect(voiceGain);
      voiceGain.connect(this._chorusWetGain);

      lfo.start();
      this._chorusDelays.push(delay);
      this._chorusLFOs.push(lfo);
      this._chorusLFOGains.push(lfoGain);
    }

    // Route
    this.sourceNode.connect(this.filter);
    this.filter.connect(this._dryGain);
    this._dryGain.connect(this.gainNode);
    this._chorusWetGain.connect(this.gainNode);

    this.sourceNode.start();
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    try { this.sourceNode.stop(); } catch {}
    this._chorusLFOs.forEach(lfo => { try { lfo.stop(); } catch {} });
    this.sourceNode = null;
    this.filter = null;
    this._chorusDelays = [];
    this._chorusLFOs = [];
    this._chorusLFOGains = [];
    this._chorusWetGain = null;
    this._dryGain = null;
    this.active = false;
  }

  _applyColor(value) {
    if (!this.filter) return;
    const minF = Math.log(150);
    const maxF = Math.log(20000);
    const freq = Math.exp(maxF - (value / 100) * (maxF - minF));
    this.filter.frequency.setTargetAtTime(freq, engine.currentTime, 0.1);
    // Very low Q — no resonant peak, just smooth rolloff
    this.filter.Q.setTargetAtTime(0.1, engine.currentTime, 0.1);
  }

  setColor(value) {
    this.colorValue = value;
    this._applyColor(value);
  }

  setChorusEnabled(enabled) {
    this.chorusActive = enabled;
    if (this._chorusWetGain) {
      this._chorusWetGain.gain.setTargetAtTime(
        enabled ? 0.5 : 0, engine.currentTime, 0.1
      );
    }
  }

  setChorusDepth(value) {
    this.chorusDepth = value;
    this._chorusLFOGains.forEach((g, i) => {
      g.gain.setTargetAtTime(value * 0.004, engine.currentTime, 0.05);
    });
  }

  setChorusRate(value) {
    this.chorusRate = value;
    this._chorusLFOs.forEach((lfo, i) => {
      lfo.frequency.setTargetAtTime(
        value * (0.8 + i * 0.3), engine.currentTime, 0.05
      );
    });
  }

  // Keep old API names working from presets
  setFlangerEnabled(enabled) { this.setChorusEnabled(enabled); }
  setFlangerDepth(value) { this.setChorusDepth(value); }
  setFlangerRate(value) { this.setChorusRate(value); }

  setVolume(value) {
    engine.setChannelVolume('noise', value);
  }
}

export const noise = new NoiseGenerator();
