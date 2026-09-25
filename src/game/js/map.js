// Citoplasma, grade invisível de construção e desenho do ambiente celular.

import { clamp } from "./utils.js";

export const CELL = 72;

export class GameMap {
  constructor(cols = 34, rows = 34) {
    this.cols = cols;
    this.rows = rows;
    this.width = cols * CELL;
    this.height = rows * CELL;
    this.cx = this.width / 2;
    this.cy = this.height / 2;
    // Raio (em células) onde é permitido construir — cresce com a célula.
    this.buildRadius = 6;
    this.occupied = new Map(); // "gx,gy" -> Building
    this.decor = [];
    this.generateDecor();
    this.terrain = null;
  }

  key(gx, gy) {
    return gx + "," + gy;
  }

  cellCenter(gx, gy) {
    return { x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 };
  }

  worldToCell(x, y) {
    return { gx: Math.floor(x / CELL), gy: Math.floor(y / CELL) };
  }

  coreCell() {
    return { gx: Math.floor(this.cx / CELL), gy: Math.floor(this.cy / CELL) };
  }

  isBuildable(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
    if (this.occupied.has(this.key(gx, gy))) return false;
    const core = this.coreCell();
    const dx = gx - core.gx;
    const dy = gy - core.gy;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return false; // área do núcleo
    return Math.hypot(dx, dy) <= this.buildRadius;
  }

  place(building) {
    this.occupied.set(this.key(building.gx, building.gy), building);
    // A célula se expande conforme cresce.
    if (this.occupied.size % 6 === 0) this.buildRadius = clamp(this.buildRadius + 1, 6, 14);
  }

  buildingAt(x, y) {
    const { gx, gy } = this.worldToCell(x, y);
    return this.occupied.get(this.key(gx, gy)) || null;
  }

  reset() {
    this.occupied.clear();
    this.buildRadius = 6;
  }

  generateDecor() {
    // Estruturas orgânicas fixas (geradas uma vez, nunca realocadas).
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const d = Math.hypot(x - this.cx, y - this.cy);
      if (d < 260) continue;
      this.decor.push({
        x,
        y,
        r: 4 + Math.random() * 9,
        type: Math.random() < 0.5 ? "vesicle" : "organic",
      });
    }
  }

  /** Terreno em cache num canvas offscreen (desenhado uma única vez). */
  buildTerrainCache() {
    const c = document.createElement("canvas");
    c.width = this.width;
    c.height = this.height;
    const g = c.getContext("2d");

    g.fillStyle = "#101c33";
    g.fillRect(0, 0, this.width, this.height);

    // Manchas de citoplasma
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const r = 30 + Math.random() * 90;
      g.fillStyle = `rgba(40, 70, 120, ${0.12 + Math.random() * 0.16})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    // Halo ao redor do Núcleo Celular
    const grd = g.createRadialGradient(this.cx, this.cy, 40, this.cx, this.cy, 700);
    grd.addColorStop(0, "rgba(120, 140, 240, 0.20)");
    grd.addColorStop(1, "rgba(120, 140, 240, 0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, this.width, this.height);

    // Grade sutil
    g.strokeStyle = "rgba(120, 170, 230, 0.06)";
    g.lineWidth = 1;
    for (let gx = 0; gx <= this.cols; gx++) {
      g.beginPath();
      g.moveTo(gx * CELL, 0);
      g.lineTo(gx * CELL, this.height);
      g.stroke();
    }
    for (let gy = 0; gy <= this.rows; gy++) {
      g.beginPath();
      g.moveTo(0, gy * CELL);
      g.lineTo(this.width, gy * CELL);
      g.stroke();
    }

    // Decoração
    for (const d of this.decor) {
      if (d.type === "vesicle") {
        g.fillStyle = "rgba(150, 200, 255, 0.18)";
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillStyle = "rgba(120, 220, 190, 0.16)";
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Membrana plasmática (borda do mundo)
    g.strokeStyle = "rgba(255, 150, 200, 0.35)";
    g.lineWidth = 8;
    g.strokeRect(4, 4, this.width - 8, this.height - 8);

    this.terrain = c;
  }

  draw(ctx, camera) {
    if (!this.terrain) this.buildTerrainCache();
    ctx.drawImage(this.terrain, 0, 0);

    // Anel de área construível
    const core = this.coreCell();
    const c = this.cellCenter(core.gx, core.gy);
    ctx.save();
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = "rgba(120, 200, 255, 0.14)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, this.buildRadius * CELL, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Destaque das células livres durante o modo de construção. */
  drawPlacementGrid(ctx, camera, hover) {
    const core = this.coreCell();
    const r = this.buildRadius;
    ctx.save();
    for (let gy = core.gy - r; gy <= core.gy + r; gy++) {
      for (let gx = core.gx - r; gx <= core.gx + r; gx++) {
        if (!this.isBuildable(gx, gy)) continue;
        const x = gx * CELL;
        const y = gy * CELL;
        const isHover = hover && hover.gx === gx && hover.gy === gy;
        ctx.fillStyle = isHover
          ? "rgba(130, 240, 180, 0.35)"
          : "rgba(120, 200, 255, 0.10)";
        ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
        ctx.strokeStyle = isHover
          ? "rgba(160, 255, 200, 0.9)"
          : "rgba(140, 200, 255, 0.28)";
        ctx.lineWidth = isHover ? 3 : 1.5;
        ctx.strokeRect(x + 4, y + 4, CELL - 8, CELL - 8);
      }
    }
    ctx.restore();
  }
}
