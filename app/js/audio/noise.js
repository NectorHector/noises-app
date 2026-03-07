// Colored Noise Generator with filter and flanger
import { engine } from './engine.js';

class NoiseGenerator {
  constructor() {
    this.sourceNode = null;
    this.filter = null;
    this.flangerDelay = null;
    this.flangerLFO = null;
    this.flangerGain = null;
    this.flangerWet = null;
    this.gainNode = null;
    this.noiseBuffer = null;
    this.active = false;
    this.flangerActive = false;
    this.colorValue = 50; // 0=white, 50=pink, 100=brown
    this.flangerDepth = 0.003;
    this.flangerRate = 0.25;
  }

  _createNoiseBuffer() {
    const ctx = engine.ctx;
    const sr = ctx.sampleRate;
    const length = sr * 4; // 4 seconds of noise
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

    // Generate noise buffer
    if (!this.noiseBuffer) {
      this.noiseBuffer = this._createNoiseBuffer();
    }

    // Create buffer source (looping)
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.noiseBuffer;
    this.sourceNode.loop = true;

    // Create filter for color shaping
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this._applyColor(this.colorValue);

    // Setup flanger
    this.flangerDelay = ctx.createDelay(0.02);
    this.flangerDelay.delayTime.value = 0.005;

    this.flangerLFO = ctx.createOscillator();
    this.flangerLFO.type = 'sine';
    this.flangerLFO.frequency.value = this.flangerRate;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = this.flangerDepth;
    this.flangerLFO.connect(lfoGain);
    lfoGain.connect(this.flangerDelay.delayTime);
    this._lfoGain = lfoGain;

    // Wet/dry mix for flanger
    this.flangerWet = ctx.createGain();
    this.flangerWet.gain.value = this.flangerActive ? 0.5 : 0;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;
    this._dryGain = dryGain;

    // Route: source → filter → dry → gainNode
    //                        → flangerDelay → flangerWet → gainNode
    this.sourceNode.connect(this.filter);
    this.filter.connect(dryGain);
    this.filter.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerWet);
    dryGain.connect(this.gainNode);
    this.flangerWet.connect(this.gainNode);

    this.sourceNode.start();
    this.flangerLFO.start();
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    try {
      this.sourceNode.stop();
      this.flangerLFO.stop();
    } catch (e) { /* already stopped */ }
    this.sourceNode = null;
    this.filter = null;
    this.flangerDelay = null;
    this.flangerLFO = null;
    this.flangerWet = null;
    this._dryGain = null;
    this._lfoGain = null;
    this.active = false;
  }

  _applyColor(value) {
    if (!this.filter) return;
    // 0 = white (high cutoff), 100 = brown (low cutoff)
    // Map 0-100 to frequency range 20000-200 Hz (logarithmic)
    const minF = Math.log(150);
    const maxF = Math.log(20000);
    const freq = Math.exp(maxF - (value / 100) * (maxF - minF));
    this.filter.frequency.setTargetAtTime(freq, engine.currentTime, 0.1);

    // Increase Q slightly for warmer sound at lower values
    const q = 0.5 + (value / 100) * 1.5;
    this.filter.Q.setTargetAtTime(q, engine.currentTime, 0.1);
  }

  setColor(value) {
    this.colorValue = value;
    this._applyColor(value);
  }

  setFlangerEnabled(enabled) {
    this.flangerActive = enabled;
    if (this.flangerWet) {
      this.flangerWet.gain.setTargetAtTime(
        enabled ? 0.5 : 0, engine.currentTime, 0.05
      );
    }
  }

  setFlangerDepth(value) {
    this.flangerDepth = value * 0.008; // 0-0.008s range
    if (this._lfoGain) {
      this._lfoGain.gain.setTargetAtTime(
        this.flangerDepth, engine.currentTime, 0.05
      );
    }
  }

  setFlangerRate(value) {
    this.flangerRate = value;
    if (this.flangerLFO) {
      this.flangerLFO.frequency.setTargetAtTime(
        value, engine.currentTime, 0.05
      );
    }
  }

  setVolume(value) {
    engine.setChannelVolume('noise', value);
  }
}

export const noise = new NoiseGenerator();
