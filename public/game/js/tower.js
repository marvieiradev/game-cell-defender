// Defesa Imunológica: dispara anticorpos automaticamente contra invasores próximos.

import { registerBuilding, roundRect, glow } from "./building.js";
import { CELL } from "./map.js";
import { TAU, dist2 } from "./utils.js";

export const towerStats = (level) => ({
  damage: 6 + 3.2 * level,
  range: 170 + 16 * level,
  fireRate: 1 + 0.18 * level, // disparos por segundo
});

registerBuilding({
  id: "tower",
  name: "Defesa Imunológica",
  glyph: "✸",
  desc: "Libera anticorpos contra os invasores próximos.",
  costMult: 2,
  stat: "defense",
  bonusText: (level) => {
    const s = towerStats(level);
    return `${s.damage.toFixed(0)} dano · ${s.range | 0} alcance · ${s.fireRate.toFixed(2)}/s`;
  },
  perLevelText: "+3.2 dano · +16 alcance · +0.18 disparos/s",

  onCreate(b) {
    b.cooldown = 0;
    b.target = null;
  },

  update(b, dt, game) {
    const stats = towerStats(b.level);
    b.cooldown -= dt;

    // Alvo mais próximo dentro do alcance
    let best = null;
    let bestD = stats.range * stats.range;
    for (const e of game.enemies.active) {
      if (e.dead) continue;
      const d = dist2(b.x, b.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    b.target = best;
    if (best) {
      b.angle = Math.atan2(best.y - b.y, best.x - b.x);
      if (b.cooldown <= 0) {
        b.cooldown = 1 / stats.fireRate;
        game.spawnProjectile(b.x, b.y - 12, best, stats.damage, "#9ad0ff", "tower");
      }
    }
  },

  draw(ctx, b, time) {
    const s = CELL * 0.26;
    const h = 20 + Math.min(b.level, 10) * 2.4;
    const breathe = 1 + Math.sin(time * 2.4 + b.pulse) * 0.05;

    // Corpo celular defensor (leucócito)
    ctx.fillStyle = "#2c4763";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.4, s * 1.25 * breathe, (h * 0.6) * breathe, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = b.level >= 5 ? "#9ad0ff" : "#5f7391";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pseudópodes ao redor (crescem com o nível)
    const arms = 4 + Math.min(Math.floor(b.level / 2), 4);
    ctx.strokeStyle = "rgba(154, 208, 255, 0.7)";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * TAU + Math.sin(time + b.pulse) * 0.1;
      const len = s * 1.3 + Math.sin(time * 3 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s, -h * 0.4 + Math.sin(a) * h * 0.4);
      ctx.lineTo(Math.cos(a) * len, -h * 0.4 + Math.sin(a) * len * 0.75);
      ctx.stroke();
    }

    // Núcleo interno do defensor apontando para o alvo
    ctx.save();
    ctx.translate(0, -h * 0.4);
    ctx.rotate(b.angle || 0);
    ctx.fillStyle = "#cbd8ee";
    roundRect(ctx, -3, -3.5, 12 + Math.min(b.level, 8), 7, 3.5);
    ctx.fill();
    ctx.restore();

    // Anticorpos orbitando (evolução visual)
    if (b.level >= 3) {
      const pulse = 1 + Math.sin(time * 3 + b.pulse) * 0.12;
      ctx.fillStyle = "#9ad0ff";
      ctx.beginPath();
      ctx.arc(0, -h - 10, (3 + b.level * 0.4) * pulse, 0, TAU);
      ctx.fill();
      glow(ctx, 0, -h - 10, 20 + b.level * 2, "rgba(154, 208, 255, 0.8)", 0.25);
    }
  },
});
