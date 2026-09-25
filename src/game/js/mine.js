// Mitocôndria: produz Energia automaticamente e fica mais potente a cada evolução.

import { registerBuilding, roundRect, glow } from "./building.js";
import { CELL } from "./map.js";
import { TAU } from "./utils.js";

export const mineStats = (level) => ({
  rate: 1 + 1.5 * (level - 1), // energia por segundo
});

registerBuilding({
  id: "mine",
  name: "Mitocôndria",
  glyph: "⬭",
  desc: "Sintetiza energia continuamente para a célula.",
  costMult: 1,
  stat: "income",
  bonusText: (level) => `${mineStats(level).rate.toFixed(1)} ⚡/s`,
  perLevelText: "+1.5 ⚡/s por evolução",

  onCreate(b) {
    b.accumulator = 0;
  },

  update(b, dt, game) {
    b.accumulator += mineStats(b.level).rate * dt;
    if (b.accumulator >= 1) {
      const gained = Math.floor(b.accumulator);
      b.accumulator -= gained;
      game.economy.add(gained);
      game.spawnFloatText(b.x, b.y - 30, "+" + gained, "#6fe3ff");
    }
  },

  draw(ctx, b, time) {
    const s = CELL * 0.3;
    const breathe = 1 + Math.sin(time * 2 + b.pulse) * 0.05;

    // Membrana externa (formato oval de mitocôndria)
    ctx.fillStyle = "#3b2a4a";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.5 * breathe, s * 0.95 * breathe, -0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#f0a6d8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cristas internas onduladas
    ctx.strokeStyle = "rgba(255, 190, 235, 0.85)";
    ctx.lineWidth = 2;
    const cristae = 3 + Math.min(Math.floor(b.level / 2), 5);
    for (let i = 0; i < cristae; i++) {
      const t = (i + 1) / (cristae + 1);
      const x = -s * 1.2 + t * s * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, -s * 0.6);
      ctx.quadraticCurveTo(x + 6, 0, x, s * 0.6);
      ctx.stroke();
    }

    // Partículas de energia liberadas
    const n = Math.min(b.level, 8);
    for (let i = 0; i < n; i++) {
      const t = (time * 0.9 + i / n) % 1;
      const px = Math.cos(i * 2.3 + b.pulse) * s * 1.1;
      const py = s * 0.4 - t * 26;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = "#6fe3ff";
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    glow(ctx, 0, 0, 24 + b.level * 4, "rgba(111, 227, 255, 0.7)", 0.16 + b.level * 0.02);

    if (b.level >= 4) {
      // Vesícula de energia acoplada
      ctx.fillStyle = "rgba(111, 227, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(s * 1.4, s * 0.5, 6, 0, TAU);
      ctx.fill();
    }
  },
});
