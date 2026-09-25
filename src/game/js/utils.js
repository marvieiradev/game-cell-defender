// Funções matemáticas e auxiliares compartilhadas.

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const choose = (arr) => arr[(Math.random() * arr.length) | 0];

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Pool genérico: evita alocar objetos durante o loop. */
export class Pool {
  constructor(factory, reset) {
    this.factory = factory;
    this.reset = reset;
    this.active = [];
    this.free = [];
  }

  spawn(...args) {
    const obj = this.free.pop() || this.factory();
    this.reset(obj, ...args);
    obj.dead = false;
    this.active.push(obj);
    return obj;
  }

  /** Remove os mortos sem realocar o array. */
  sweep() {
    const a = this.active;
    let w = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i].dead) this.free.push(a[i]);
      else a[w++] = a[i];
    }
    a.length = w;
  }

  clear() {
    for (const o of this.active) this.free.push(o);
    this.active.length = 0;
  }
}
