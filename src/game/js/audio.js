// Áudio procedural via WebAudio (sem assets binários).

import { Save } from "./save.js";

class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = Save.data.settings.sound !== false;
  }

  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(on) {
    this.enabled = on;
    Save.setSetting("sound", on);
  }

  tone(freq, dur = 0.08, type = "square", vol = 1) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  shoot() {
    this.tone(660, 0.05, "square", 0.25);
  }
  hit() {
    this.tone(220, 0.06, "sawtooth", 0.3);
  }
  pickup() {
    this.tone(980, 0.06, "triangle", 0.35);
  }
  build() {
    this.tone(320, 0.12, "triangle", 0.5);
    setTimeout(() => this.tone(520, 0.14, "triangle", 0.45), 90);
  }
  upgrade() {
    this.tone(520, 0.1, "triangle", 0.45);
    setTimeout(() => this.tone(780, 0.16, "triangle", 0.4), 80);
  }
  wave() {
    this.tone(150, 0.3, "sawtooth", 0.35);
  }
  hurt() {
    this.tone(120, 0.16, "sawtooth", 0.5);
  }
  over() {
    this.tone(200, 0.5, "sawtooth", 0.5);
    setTimeout(() => this.tone(110, 0.9, "sawtooth", 0.5), 260);
  }
}

export const Audio = new AudioManager();
