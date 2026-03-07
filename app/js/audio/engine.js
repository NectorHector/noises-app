// Audio Engine - manages AudioContext, master gain, and channel routing

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.channels = {};
    this.isPlaying = false;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100
    });
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.75;
    this._initialized = true;
  }

  async resume() {
    if (!this._initialized) this.init();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  createChannel(name) {
    if (this.channels[name]) return this.channels[name];
    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);
    gain.gain.value = 0.5;
    this.channels[name] = gain;
    return gain;
  }

  getChannel(name) {
    return this.channels[name] || this.createChannel(name);
  }

  setChannelVolume(name, value, rampTime = 0.05) {
    const channel = this.channels[name];
    if (!channel) return;
    const now = this.ctx.currentTime;
    channel.gain.cancelScheduledValues(now);
    channel.gain.setTargetAtTime(value, now, rampTime);
  }

  setMasterVolume(value, rampTime = 0.05) {
    if (!this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(value, now, rampTime);
  }

  fadeOut(durationMs = 30000) {
    return new Promise(resolve => {
      if (!this.masterGain) { resolve(); return; }
      const now = this.ctx.currentTime;
      const duration = durationMs / 1000;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + duration);
      setTimeout(resolve, durationMs);
    });
  }

  get currentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  get sampleRate() {
    return this.ctx ? this.ctx.sampleRate : 44100;
  }
}

export const engine = new AudioEngine();
