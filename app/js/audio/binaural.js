// Binaural Beats - two slightly detuned oscillators panned left/right
import { engine } from './engine.js';

class BinauralBeats {
  constructor() {
    this.oscLeft = null;
    this.oscRight = null;
    this.merger = null;
    this.gainNode = null;
    this.carrierFreq = 180;
    this.beatFreq = 4;
    this.active = false;
  }

  start() {
    if (this.active) return;
    const ctx = engine.ctx;
    this.gainNode = engine.getChannel('binaural');

    this.merger = ctx.createChannelMerger(2);
    this.merger.connect(this.gainNode);

    // Left ear: carrier frequency
    this.oscLeft = ctx.createOscillator();
    this.oscLeft.type = 'sine';
    this.oscLeft.frequency.value = this.carrierFreq;

    // Right ear: carrier + beat frequency
    this.oscRight = ctx.createOscillator();
    this.oscRight.type = 'sine';
    this.oscRight.frequency.value = this.carrierFreq + this.beatFreq;

    // Create individual gain nodes for each channel to avoid stereo issues
    const gainLeft = ctx.createGain();
    const gainRight = ctx.createGain();
    gainLeft.gain.value = 1;
    gainRight.gain.value = 1;

    this.oscLeft.connect(gainLeft);
    this.oscRight.connect(gainRight);
    gainLeft.connect(this.merger, 0, 0);
    gainRight.connect(this.merger, 0, 1);

    this.oscLeft.start();
    this.oscRight.start();
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    try {
      this.oscLeft.stop();
      this.oscRight.stop();
    } catch (e) { /* already stopped */ }
    this.oscLeft = null;
    this.oscRight = null;
    this.merger = null;
    this.active = false;
  }

  setBeatFrequency(freq) {
    this.beatFreq = freq;
    if (this.oscRight) {
      this.oscRight.frequency.setTargetAtTime(
        this.carrierFreq + freq, engine.currentTime, 0.1
      );
    }
  }

  setCarrierFrequency(freq) {
    this.carrierFreq = freq;
    if (this.oscLeft) {
      this.oscLeft.frequency.setTargetAtTime(freq, engine.currentTime, 0.1);
    }
    if (this.oscRight) {
      this.oscRight.frequency.setTargetAtTime(
        freq + this.beatFreq, engine.currentTime, 0.1
      );
    }
  }

  setVolume(value) {
    engine.setChannelVolume('binaural', value);
  }
}

export const binaural = new BinauralBeats();
