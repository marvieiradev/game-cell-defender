// Invasores: tipos configuráveis, IA simples (perseguir a célula defensora ou o Núcleo Celular).

import { TAU, dist, dist2 } from "./utils.js";

export const ENEMY_TYPES = {
  grunt: {
    id: "grunt",
    name: "Bactéria",
    hp: 26,
    speed: 62,
    damage: 7,
    radius: 13,
    vision: 260,
    reward: 2,
    color: "#8a5cf6",
    accent: "#c4b5fd",
  },
  runner: {
    id: "runner",
    name: "Vírus",
    hp: 18,
    speed: 118,
    damage: 5,
    radius: 11,
    vision: 380,
    reward: 3,
    color: "#f472b6",
    accent: "#fbcfe8",
  },
  brute: {
    id: "brute",
    name: "Parasita",
    hp: 90,
    speed: 44,
    damage: 16,
    radius: 19,
    vision: 220,
    reward: 6,
    color: "#f97316",
    accent: "#fed7aa",
  },
  shade: {
    id: "shade",
    name: "Toxina",
    hp: 46,
    speed: 88,
    damage: 11,
    radius: 14,
    vision: 460,
    reward: 5,
    color: "#38bdf8",
    accent: "#bae6fd",
  },
  boss: {
    id: "boss",
    name: "Super Invasor",
    hp: 620,
    speed: 52,
    damage: 26,
    radius: 32,
    vision: 700,
    reward: 60,
    color: "#ef4444",
    accent: "#fecaca",
  },
};

export function createEnemy() {
  return {
    x: 0,
    y: 0,
    hp: 1,
    maxHp: 1,
    dead: false,
    def: ENEMY_TYPES.grunt,
    speed: 0,
    damage: 0,
    radius: 12,
    reward: 1,
    attackCd: 0,
    hitFlash: 0,
    phase: 0,
    isBoss: false,
  };
}

export function resetEnemy(e, def, x, y, scale) {
  e.def = def;
  e.x = x;
  e.y = y;
  e.maxHp = def.hp * scale.hp;
  e.hp = e.maxHp;
  e.speed = def.speed * scale.speed;
  e.damage = def.damage * scale.damage;
  e.radius = def.radius;
  e.reward = def.reward;
  e.attackCd = 0;
  e.hitFlash = 0;
  e.phase = Math.random() * TAU;
  e.isBoss = def.id === "boss";
}

export function updateEnemy(e, dt, game) {
  e.phase += dt;
  if (e.hitFlash > 0) e.hitFlash -= dt;

  const player = game.player;
  const seesPlayer = dist2(e.x, e.y, player.x, player.y) < e.def.vision * e.def.vision;
  const tx = seesPlayer ? player.x : game.core.x;
  const ty = seesPlayer ? player.y : game.core.y;

  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;

  const contact = seesPlayer ? e.radius + player.radius : e.radius + game.core.radius;
  if (d > contact) {
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;
  } else {
    e.attackCd -= dt;
    if (e.attackCd <= 0) {
      e.attackCd = 1;
      if (seesPlayer) {
        const dealt = player.takeDamage(e.damage);
        if (dealt === -1) {
          game.spawnFloatText(player.x, player.y - 26, "esquiva", "#bae6fd");
        } else if (dealt > 0) {
          game.audio.hurt();
          game.camera.shake(8, 0.18);
          game.spawnFloatText(player.x, player.y - 26, "-" + Math.round(dealt), "#ff6b6b");
        }
      } else {
        game.damageCore(e.damage);
      }
    }
  }

  // Separação simples entre inimigos (evita empilhamento total)
  const others = game.enemies.active;
  for (let i = 0; i < others.length; i += 2) {
    const o = others[i];
    if (o === e || o.dead) continue;
    const ddx = e.x - o.x;
    const ddy = e.y - o.y;
    const dd = ddx * ddx + ddy * ddy;
    const min = (e.radius + o.radius) * 0.85;
    if (dd > 0.01 && dd < min * min) {
      const len = Math.sqrt(dd);
      e.x += (ddx / len) * 24 * dt;
      e.y += (ddy / len) * 24 * dt;
    }
  }
}

export function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.75, e.radius * 0.9, e.radius * 0.4, 0, 0, TAU);
  ctx.fill();

  const wobble = Math.sin(time * 6 + e.phase) * (e.radius * 0.08);
  ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : e.def.color;
  ctx.beginPath();
  ctx.ellipse(0, wobble, e.radius, e.radius * 1.05, 0, 0, TAU);
  ctx.fill();

  // Olhos
  ctx.fillStyle = e.def.accent;
  const eo = e.radius * 0.35;
  ctx.beginPath();
  ctx.arc(-eo, wobble - 2, e.radius * 0.16, 0, TAU);
  ctx.arc(eo, wobble - 2, e.radius * 0.16, 0, TAU);
  ctx.fill();

  if (e.isBoss) {
    ctx.strokeStyle = "#fecaca";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.7, -e.radius * 0.8);
    ctx.lineTo(-e.radius * 1.1, -e.radius * 1.5);
    ctx.moveTo(e.radius * 0.7, -e.radius * 0.8);
    ctx.lineTo(e.radius * 1.1, -e.radius * 1.5);
    ctx.stroke();
  }

  // Barra de vida
  if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(-w / 2, -e.radius - 12, w, 4);
    ctx.fillStyle = e.isBoss ? "#ef4444" : "#4ade80";
    ctx.fillRect(-w / 2, -e.radius - 12, w * (e.hp / e.maxHp), 4);
  }

  ctx.restore();
}
