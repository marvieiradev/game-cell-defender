// Sistema de organelos: registro de tipos, custos e evolução visual.
// Para adicionar um novo organelo basta registrar um tipo aqui.

import { CELL } from "./map.js";
import { TAU } from "./utils.js";

/** Custo exponencial: 5, 10, 20, 35, 55, 80, ... */
export function levelCost(level, mult = 1) {
  return Math.round((5 + 2.5 * level * (level - 1)) * mult);
}

const BUILDINGS = new Map();

export function registerBuilding(def) {
  BUILDINGS.set(def.id, def);
}

export function getBuildingDef(id) {
  return BUILDINGS.get(id);
}

export function allBuildingDefs() {
  return [...BUILDINGS.values()];
}

export class Building {
  constructor(def, gx, gy) {
    this.def = def;
    this.type = def.id;
    this.gx = gx;
    this.gy = gy;
    this.x = gx * CELL + CELL / 2;
    this.y = gy * CELL + CELL / 2;
    this.level = 1;
    this.timer = 0;
    this.angle = 0;
    this.pulse = Math.random() * TAU;
    if (def.onCreate) def.onCreate(this);
  }

  get name() {
    return this.def.name;
  }

  upgradeCost() {
    return levelCost(this.level + 1, this.def.costMult);
  }

  buildCost() {
    return levelCost(1, this.def.costMult);
  }

  upgrade() {
    this.level++;
    if (this.def.onUpgrade) this.def.onUpgrade(this);
  }

  update(dt, game) {
    this.pulse += dt;
    if (this.def.update) this.def.update(this, dt, game);
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);
    drawPlatform(ctx, this.level);
    this.def.draw(ctx, this, time);
    drawFlags(ctx, this.level, time);
    ctx.restore();
    drawLevelBadge(ctx, this);
  }
}

/* ---------- Peças visuais compartilhadas ---------- */

function drawPlatform(ctx, level) {
  const s = CELL * 0.42 + Math.min(level, 8) * 0.7;
  ctx.fillStyle = "rgba(10, 18, 32, 0.45)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.55, s * 1.05, s * 0.45, 0, 0, TAU);
  ctx.fill();

  // Membrana orgânica que envolve o organelo
  ctx.fillStyle = "rgba(37, 51, 79, 0.92)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.15, s * 1.05, s * 0.85, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = level >= 5 ? "#9ad0ff" : "#3c5075";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Vesículas nas bordas conforme evolui
  if (level >= 3) {
    ctx.fillStyle = "rgba(70, 200, 180, 0.55)";
    for (let i = 0; i < Math.min(level, 6); i++) {
      const a = (i / 6) * TAU + 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.7 + s * 0.2, 3.2, 0, TAU);
      ctx.fill();
    }
  }
}

/** Cílios que ondulam na membrana — substituem as antigas bandeiras. */
function drawFlags(ctx, level, time) {
  if (level < 2) return;
  const n = Math.min(Math.floor(level / 2), 4);
  const s = CELL * 0.42;
  for (let i = 0; i < n; i++) {
    const x = -s + 8 + i * ((s * 2 - 16) / Math.max(1, n - 1 || 1));
    const y = -s * 0.55;
    const wave = Math.sin(time * 4 + i) * 5;
    ctx.strokeStyle = "rgba(126, 224, 192, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + wave, y - 8, x + wave * 1.4, y - 15);
    ctx.stroke();
  }
}


function drawLevelBadge(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y - CELL * 0.5);
  ctx.fillStyle = "rgba(8, 14, 26, 0.8)";
  roundRect(ctx, -14, -11, 28, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#ffd479";
  ctx.font = "bold 11px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Lv " + b.level, 0, -3);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---------- Organelos de suporte (bônus passivos) ---------- */

function supportDef({ id, name, glyph, desc, bonusPerLevel, unit, stat, color, extras }) {
  return {
    id,
    name,
    glyph,
    desc,
    stat,
    costMult: 1.4,
    bonusPerLevel,
    bonusText: (level) => `+${(bonusPerLevel * level).toFixed(unit === "%" ? 0 : 0)}${unit}`,
    perLevelText: `+${bonusPerLevel}${unit} por evolução`,
    draw(ctx, b, time) {
      const s = CELL * 0.3;
      const breathe = 1 + Math.sin(time * 2 + b.pulse) * 0.06;
      // Corpo orgânico (bolha celular)
      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.ellipse(0, -2, s * 1.15 * breathe, s * 1.05 * breathe, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = color.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cúpula interna que cresce com a evolução
      ctx.fillStyle = color.roof;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.5, s * 0.7, (6 + Math.min(b.level, 6) * 1.2) * breathe, 0, 0, TAU);
      ctx.fill();
      // Bioluminescência crescente
      if (b.level >= 2) glow(ctx, 0, 0, 34 + b.level * 3, color.glow, 0.18 + b.level * 0.02);
      // Detalhes específicos por nível
      extras(ctx, b, time, s, color);
    },

  };
}

/* Ribossomos */
registerBuilding(
  supportDef({
    id: "barracks",
    name: "Ribossomos",
    glyph: "⁘",
    desc: "Produzem proteínas que fortalecem o ataque da célula.",
    bonusPerLevel: 5,
    unit: "% Ataque",
    stat: "attack",
    color: { body: "#4a3b31", roof: "#8c4a37", line: "#c98b62", glow: "rgba(255,150,90,0.6)" },
    extras(ctx, b, time, s) {
      // Cadeias de proteína em formação
      const beads = Math.min(b.level, 5);
      for (let i = 0; i < beads; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 0.6 + b.pulse;
        ctx.fillStyle = "#f0c9a6";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.6 + s * 0.2, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  })
);

/* Regeneração Celular */
registerBuilding(
  supportDef({
    id: "hospital",
    name: "Regeneração Celular",
    glyph: "✚",
    desc: "Repara danos e aumenta sua vida máxima.",
    bonusPerLevel: 20,
    unit: " HP",
    stat: "hp",
    color: { body: "#eef3fa", roof: "#c8d7ea", line: "#9fb6d4", glow: "rgba(140,255,190,0.6)" },
    extras(ctx, b, time, s) {
      ctx.fillStyle = "#e05a5a";
      ctx.fillRect(-3, -s + 2, 6, 16);
      ctx.fillRect(-8, -s + 7, 16, 6);
      const tents = Math.min(b.level - 1, 4);
      for (let i = 0; i < tents; i++) {
        ctx.fillStyle = "rgba(220, 240, 255, 0.8)";
        ctx.beginPath();
        ctx.moveTo(-s - 10 - i * 3, s * 0.85);
        ctx.lineTo(-s - 4 - i * 3, s * 0.45);
        ctx.lineTo(-s + 2 - i * 3, s * 0.85);
        ctx.closePath();
        ctx.fill();
      }
    },
  })
);

/* Transporte Celular */
registerBuilding(
  supportDef({
    id: "academy",
    name: "Transporte Celular",
    glyph: "≈",
    desc: "Move substâncias mais rápido e aumenta sua velocidade.",
    bonusPerLevel: 4,
    unit: "% Velocidade",
    stat: "speed",
    color: { body: "#2f3f63", roof: "#4b6bb0", line: "#8fb0e8", glow: "rgba(120,180,255,0.6)" },
    extras(ctx, b, time, s) {
      const books = Math.min(b.level, 6);
      for (let i = 0; i < books; i++) {
        ctx.fillStyle = ["#ffd479", "#7ee0c0", "#ff9aa2", "#9ad0ff"][i % 4];
        ctx.fillRect(-s + 3 + i * 5, s * 0.35, 4, 10);
      }
    },
  })
);

/* Membrana Celular */
registerBuilding(
  supportDef({
    id: "workshop",
    name: "Membrana Celular",
    glyph: "◌",
    desc: "Reforça a barreira protetora e aumenta sua defesa.",
    bonusPerLevel: 3,
    unit: " Defesa",
    stat: "defense",
    color: { body: "#3b3f47", roof: "#6b727f", line: "#a9b3c4", glow: "rgba(255,190,120,0.6)" },
    extras(ctx, b, time, s) {
      // Fornalha acesa
      const f = 0.5 + Math.sin(time * 6 + b.pulse) * 0.5;
      ctx.fillStyle = `rgba(255, ${120 + f * 90}, 60, ${0.7 + f * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, s * 0.35, 5 + Math.min(b.level, 6) * 0.6 + f * 1.5, 0, TAU);
      ctx.fill();
      if (b.level >= 3) {
        ctx.strokeStyle = "#cbd8ee";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 0.6, s * 0.7);
        ctx.lineTo(s * 0.9, s * 0.2);
        ctx.stroke();
      }
    },
  })
);

/* Mecanismo de Proteção */
registerBuilding(
  supportDef({
    id: "sanctuary",
    name: "Mecanismo de Proteção",
    glyph: "✧",
    desc: "Evita ataques dos invasores: aumenta sua esquiva.",
    bonusPerLevel: 2,
    unit: "% Esquiva",
    stat: "dodge",
    color: { body: "#33305c", roof: "#6b5fb5", line: "#b8a8ff", glow: "rgba(190,150,255,0.7)" },
    extras(ctx, b, time, s) {
      const r = 6 + Math.min(b.level, 8);
      ctx.strokeStyle = "rgba(200, 180, 255, 0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -2, r + Math.sin(time * 2 + b.pulse) * 2, 0, TAU);
      ctx.stroke();
      if (b.level >= 2) {
        ctx.fillStyle = "rgba(230, 220, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(0, -2, 3.5, 0, TAU);
        ctx.fill();
      }
    },
  })
);

/* Enzimas */
registerBuilding(
  supportDef({
    id: "forge",
    name: "Enzimas",
    glyph: "⟡",
    desc: "Catalisam reações agressivas: aumentam o crítico.",
    bonusPerLevel: 3,
    unit: "% Crítico",
    stat: "crit",
    color: { body: "#46251f", roof: "#93402c", line: "#e0895c", glow: "rgba(255,120,60,0.7)" },
    extras(ctx, b, time, s) {
      // Sítio ativo da enzima
      ctx.fillStyle = "#ffb08a";
      ctx.beginPath();
      ctx.arc(0, s * 0.4, 6, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.closePath();
      ctx.fill();
      // Faíscas
      const sparks = Math.min(b.level, 8);
      for (let i = 0; i < sparks; i++) {
        const t = (time * 2.2 + i * 0.7 + b.pulse) % 1;
        ctx.fillStyle = `rgba(255, ${170 - t * 90}, 60, ${1 - t})`;
        ctx.beginPath();
        ctx.arc(Math.sin(i * 2.1) * 12, s * 0.3 - t * 22, 1.8, 0, TAU);
        ctx.fill();
      }
    },
  })
);
