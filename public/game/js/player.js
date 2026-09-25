// Célula defensora: movimento em 8 direções, ataque automático e atributos
// derivados exclusivamente dos organelos construídos.

import { clamp, dist2, TAU } from "./utils.js";

const BASE = {
  maxHp: 100,
  attack: 12,
  defense: 2,
  speed: 190,
  dodge: 3, // %
  crit: 5, // %
  critMult: 2,
  attackSpeed: 1.6, // ataques por segundo
  range: 230,
};

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.dirX = 0;
    this.dirY = -1;
    this.cooldown = 0;
    this.invuln = 0;
    this.stats = { ...BASE };
    this.hp = BASE.maxHp;
    this.walkPhase = 0;
    this.moving = false;
    this.lastDodge = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.stats = { ...BASE };
    this.hp = BASE.maxHp;
    this.cooldown = 0;
    this.invuln = 0;
  }

  /** Recalcula atributos a partir dos níveis dos edifícios. */
  recalcStats(buildings) {
    const sum = { barracks: 0, hospital: 0, academy: 0, workshop: 0, sanctuary: 0, forge: 0 };
    for (const b of buildings) {
      if (sum[b.type] !== undefined) sum[b.type] += b.level;
    }

    const s = this.stats;
    const prevMax = s.maxHp;
    s.maxHp = BASE.maxHp + sum.hospital * 20;
    s.attack = BASE.attack * (1 + sum.barracks * 0.05);
    s.speed = BASE.speed * (1 + sum.academy * 0.04);
    s.defense = BASE.defense + sum.workshop * 3;
    s.dodge = clamp(BASE.dodge + sum.sanctuary * 2, 0, 70);
    s.crit = clamp(BASE.crit + sum.forge * 3, 0, 90);
    s.attackSpeed = BASE.attackSpeed;
    s.range = BASE.range;

    if (s.maxHp > prevMax) this.hp += s.maxHp - prevMax; // hospital cura na hora
    this.hp = Math.min(this.hp, s.maxHp);
  }

  takeDamage(amount) {
    if (this.invuln > 0) return 0;
    if (Math.random() * 100 < this.stats.dodge) {
      this.lastDodge = 0.6;
      return -1; // esquivou
    }
    const reduced = amount * (1 - this.stats.defense / (this.stats.defense + 30));
    this.hp -= reduced;
    this.invuln = 0.35;
    return reduced;
  }

  update(dt, game) {
    const input = game.input.moveVector();
    this.moving = input.x !== 0 || input.y !== 0;
    if (this.moving) {
      this.dirX = input.x;
      this.dirY = input.y;
      this.x += input.x * this.stats.speed * dt;
      this.y += input.y * this.stats.speed * dt;
      this.walkPhase += dt * 12;
    } else {
      this.walkPhase *= 0.85;
    }

    this.x = clamp(this.x, 20, game.map.width - 20);
    this.y = clamp(this.y, 20, game.map.height - 20);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.lastDodge > 0) this.lastDodge -= dt;

    // Ataque automático no inimigo mais próximo dentro do alcance
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      const target = this.findTarget(game);
      if (target) {
        this.cooldown = 1 / this.stats.attackSpeed;
        const isCrit = Math.random() * 100 < this.stats.crit;
        const dmg = this.stats.attack * (isCrit ? this.stats.critMult : 1);
        game.spawnProjectile(this.x, this.y - 6, target, dmg, isCrit ? "#ffd479" : "#7ee0c0", "player", isCrit);
        game.audio.shoot();
      }
    }
  }

  findTarget(game) {
    let best = null;
    let bestD = this.stats.range * this.stats.range;
    for (const e of game.enemies.active) {
      if (e.dead) continue;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  draw(ctx, time) {
    const bob = Math.sin(this.walkPhase) * 2;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 12, 5, 0, 0, TAU);
    ctx.fill();

    // Aura de alcance discreta
    ctx.strokeStyle = "rgba(126, 224, 192, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.stats.range, 0, TAU);
    ctx.stroke();

    const flash = this.invuln > 0 && Math.floor(time * 20) % 2 === 0;

    // Capa
    ctx.fillStyle = flash ? "#ffffff" : "#2f6fbf";
    ctx.beginPath();
    ctx.ellipse(-this.dirX * 5, 2 + bob, 11, 13, 0, 0, TAU);
    ctx.fill();

    // Corpo
    ctx.fillStyle = flash ? "#ffffff" : "#dfe9fb";
    ctx.beginPath();
    ctx.arc(0, bob, 9, 0, TAU);
    ctx.fill();

    // Visor / direção
    ctx.fillStyle = "#1a2740";
    ctx.beginPath();
    ctx.arc(this.dirX * 4, bob + this.dirY * 3, 3.4, 0, TAU);
    ctx.fill();

    if (this.lastDodge > 0) {
      ctx.fillStyle = `rgba(200, 230, 255, ${this.lastDodge})`;
      ctx.font = "bold 12px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText("esquiva!", 0, -24);
    }

    ctx.restore();
  }
}
