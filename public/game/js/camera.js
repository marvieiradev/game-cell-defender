// Câmera que segue o jogador com suavização e limites do mundo.

import { clamp, lerp } from "./utils.js";

export class Camera {
  constructor(world) {
    this.world = world;
    this.x = world.width / 2;
    this.y = world.height / 2;
    this.vw = 0;
    this.vh = 0;
    this.zoom = 1;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.ox = 0;
    this.oy = 0;
  }

  resize(vw, vh) {
    this.vw = vw;
    this.vh = vh;
    // Zoom adaptativo: telas pequenas mostram uma área equivalente.
    this.zoom = clamp(Math.min(vw, vh) / 620, 0.62, 1.35);
  }

  shake(mag, time = 0.2) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  follow(target, dt) {
    const halfW = this.vw / (2 * this.zoom);
    const halfH = this.vh / (2 * this.zoom);
    const tx = clamp(target.x, halfW, this.world.width - halfW);
    const ty = clamp(target.y, halfH, this.world.height - halfH);
    const t = 1 - Math.pow(0.001, dt);
    this.x = lerp(this.x, tx, t);
    this.y = lerp(this.y, ty, t);

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeTime / 0.2);
      this.ox = (Math.random() - 0.5) * m;
      this.oy = (Math.random() - 0.5) * m;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    } else {
      this.ox = this.oy = 0;
    }
  }

  apply(ctx) {
    ctx.translate(this.vw / 2, this.vh / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x + this.ox, -this.y + this.oy);
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.vw / 2) / this.zoom + this.x,
      y: (sy - this.vh / 2) / this.zoom + this.y,
    };
  }

  get viewLeft() {
    return this.x - this.vw / (2 * this.zoom);
  }
  get viewTop() {
    return this.y - this.vh / (2 * this.zoom);
  }
  get viewRight() {
    return this.x + this.vw / (2 * this.zoom);
  }
  get viewBottom() {
    return this.y + this.vh / (2 * this.zoom);
  }
}
