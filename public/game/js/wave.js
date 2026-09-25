// Gerenciador de invasões: spawn infinito com escalonamento e super invasores.

import { ENEMY_TYPES } from "./enemy.js";
import { TAU, randInt, choose } from "./utils.js";

export class WaveManager {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.wave = 0;
    this.timeToNext = 3;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.pool = ["grunt"];
    this.active = 0;
  }

  get scale() {
    const w = this.wave;
    return {
      hp: 1 + w * 0.16,
      damage: 1 + w * 0.1,
      speed: 1 + Math.min(w * 0.015, 0.6),
    };
  }

  update(dt) {
    if (this.spawnQueue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 0.28;
        this.spawnOne();
        this.spawnQueue--;
      }
      return;
    }

    this.timeToNext -= dt;
    if (this.timeToNext <= 0) this.startWave();
  }

  startWave() {
    this.wave++;
    const w = this.wave;

    if (w >= 3 && !this.pool.includes("runner")) this.pool.push("runner");
    if (w >= 6 && !this.pool.includes("brute")) this.pool.push("brute");
    if (w >= 9 && !this.pool.includes("shade")) this.pool.push("shade");

    this.spawnQueue = 4 + Math.floor(w * 1.6);
    this.spawnTimer = 0;
    this.timeToNext = 18 + Math.min(w * 0.5, 10);

    if (w % 5 === 0) this.spawnBoss();

    this.game.audio.wave();
    this.game.announce(`Invasão ${w}` + (w % 5 === 0 ? " — SUPER INVASOR!" : ""));
    this.game.ui.updateHud(true);
  }

  spawnPoint() {
    // Surge fora da visão, num anel ao redor do Núcleo Celular.
    const map = this.game.map;
    const a = Math.random() * TAU;
    const r = 900 + Math.random() * 260;
    const x = Math.min(Math.max(map.cx + Math.cos(a) * r, 40), map.width - 40);
    const y = Math.min(Math.max(map.cy + Math.sin(a) * r, 40), map.height - 40);
    return { x, y };
  }

  spawnOne() {
    const type = choose(this.pool);
    const p = this.spawnPoint();
    this.game.enemies.spawn(ENEMY_TYPES[type], p.x, p.y, this.scale);
  }

  spawnBoss() {
    const p = this.spawnPoint();
    const scale = this.scale;
    this.game.enemies.spawn(ENEMY_TYPES.boss, p.x, p.y, {
      hp: scale.hp * (1 + this.wave * 0.05),
      damage: scale.damage,
      speed: 1,
    });
    this.game.camera.shake(14, 0.5);
  }
}
