// Colored Noise Generator with filter and reverb effect
import { engine } from './engine.js';

class NoiseGenerator {
  constructor() {
    this.sourceNode = null;
    this.filter = null;
    this.gainNode = null;
    this.noiseBuffer = null;
    this.active = false;
    this.reverbActive = false;
    this.colorValue = 50;
    this.reverbAmount = 0.5;
    // Reverb internals
    this._reverb = null;
    this._reverbGain = null;
    this._dryGain = null;
  }

  _createNoiseBuffer() {
    const ctx = engine.ctx;
    const sr = ctx.sampleRate;
    const length = sr * 6;
    const buffer = ctx.createBuffer(2, length, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  _createReverbIR() {
    const ctx = engine.ctx;
    const duration = 3;
    const decay = 1.0;
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
    this.filter.Q.value = 0.1;
    this._applyColor(this.colorValue);

    // Dry path
    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 1;

    // Convolution reverb
    this._reverb = ctx.createConvolver();
    this._reverb.buffer = this._createReverbIR();
    this._reverbGain = ctx.createGain();
    this._reverbGain.gain.value = this.reverbActive ? this.reverbAmount * 0.6 : 0;
    this._reverb.connect(this._reverbGain);

    // Route
    this.sourceNode.connect(this.filter);
    this.filter.connect(this._dryGain);
    this.filter.connect(this._reverb);
    this._dryGain.connect(this.gainNode);
    this._reverbGain.connect(this.gainNode);

    this.sourceNode.start();
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    try { this.sourceNode.stop(); } catch {}
    this.sourceNode = null;
    this.filter = null;
    this._reverb = null;
    this._reverbGain = null;
    this._dryGain = null;
    this.active = false;
  }

  _applyColor(value) {
    if (!this.filter) return;
    const minF = Math.log(150);
    const maxF = Math.log(20000);
    const freq = Math.exp(maxF - (value / 100) * (maxF - minF));
    this.filter.frequency.setTargetAtTime(freq, engine.currentTime, 0.1);
    this.filter.Q.setTargetAtTime(0.1, engine.currentTime, 0.1);
  }

  setColor(value) {
    this.colorValue = value;
    this._applyColor(value);
  }

  setReverbEnabled(enabled) {
    this.reverbActive = enabled;
    if (this._reverbGain) {
      this._reverbGain.gain.setTargetAtTime(
        enabled ? this.reverbAmount * 0.6 : 0, engine.currentTime, 0.1
      );
    }
  }

  setReverbAmount(value) {
    this.reverbAmount = value;
    if (this._reverbGain && this.reverbActive) {
      this._reverbGain.gain.setTargetAtTime(value * 0.6, engine.currentTime, 0.05);
    }
  }

  // Keep old API names working from presets
  setChorusEnabled(enabled) { this.setReverbEnabled(enabled); }
  setChorusDepth() {}
  setChorusRate() {}
  setFlangerEnabled(enabled) { this.setReverbEnabled(enabled); }
  setFlangerDepth() {}
  setFlangerRate() {}

  setVolume(value) {
    engine.setChannelVolume('noise', value);
  }
}

export const noise = new NoiseGenerator();
