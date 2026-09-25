// Núcleo do jogo: estado, loop, atualização e renderização.

import { GameMap, CELL } from "./map.js";
import { Camera } from "./camera.js";
import { Player } from "./player.js";
import { Economy } from "./economy.js";
import { WaveManager } from "./wave.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { Save } from "./save.js";
import { Building, getBuildingDef, allBuildingDefs } from "./building.js";
import { createEnemy, resetEnemy, updateEnemy, drawEnemy } from "./enemy.js";
import { Pool, TAU, clamp, dist2, formatTime } from "./utils.js";
import "./mine.js";
import "./tower.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.map = new GameMap();
    this.camera = new Camera(this.map);
    this.economy = new Economy();
    this.player = new Player(this.map.cx, this.map.cy + 120);
    this.waves = new WaveManager(this);
    this.audio = Audio;
    this.input = new Input(canvas, document.getElementById("joystick"));
    this.ui = new UI(this);

    this.core = {
      x: this.map.cx,
      y: this.map.cy,
      radius: 42,
      hp: 1000,
      maxHp: 1000,
      pulse: 0,
    };

    this.buildings = [];
    this.enemies = new Pool(createEnemy, resetEnemy);
    this.projectiles = new Pool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, dmg: 0, color: "#fff", owner: "player", life: 0, dead: false, crit: false, target: null }),
      (p, x, y, target, dmg, color, owner, crit) => {
        p.x = x;
        p.y = y;
        p.target = target;
        p.dmg = dmg;
        p.color = color;
        p.owner = owner;
        p.crit = !!crit;
        p.life = 2.2;
        const a = Math.atan2(target.y - y, target.x - x);
        const sp = 620;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
      }
    );
    this.energy = new Pool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, value: 1, life: 0, dead: false }),
      (c, x, y, value) => {
        c.x = x;
        c.y = y;
        const a = Math.random() * TAU;
        c.vx = Math.cos(a) * 60;
        c.vy = Math.sin(a) * 60;
        c.value = value;
        c.life = 30;
      }
    );
    this.floats = new Pool(
      () => ({ x: 0, y: 0, text: "", color: "#fff", life: 0, dead: false }),
      (f, x, y, text, color) => {
        f.x = x;
        f.y = y;
        f.text = text;
        f.color = color;
        f.life = 0.9;
      }
    );
    this.particles = new Pool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 2, color: "#fff", life: 0, dead: false }),
      (p, x, y, color) => {
        p.x = x;
        p.y = y;
        const a = Math.random() * TAU;
        const s = 60 + Math.random() * 140;
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        p.r = 1.5 + Math.random() * 2.5;
        p.color = color;
        p.life = 0.4 + Math.random() * 0.3;
      }
    );

    this.state = "menu"; // menu | playing | paused | over
    this.elapsed = 0;
    this.time = 0;
    this.lastTs = 0;
    this.hudTimer = 0;
    this.placingType = null;
    this.hoverCell = null;
    this.announceText = "";
    this.announceTime = 0;

    // Bolhas orgânicas flutuando no citoplasma (ambientação)
    this.ambient = [];
    for (let i = 0; i < 90; i++) {
      this.ambient.push({
        x: Math.random() * this.map.width,
        y: Math.random() * this.map.height,
        r: 3 + Math.random() * 9,
        sp: 6 + Math.random() * 14,
        phase: Math.random() * TAU,
      });
    }

    this.bindEvents();
    this.resize();
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    this.input.onTap((sx, sy) => this.handleTap(sx, sy));
    this.input.onHover((sx, sy) => {
      if (!this.placingType) return;
      const w = this.camera.screenToWorld(sx, sy);
      this.hoverCell = this.map.worldToCell(w.x, w.y);
    });
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (this.placingType) this.cancelPlacement();
        else this.ui.closeBuildingPanel();
      }
      if (k === "b" && this.state === "playing") this.ui.openBuildMenu();
      if (k === "p") this.togglePause();
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.camera.resize(w, h);
  }

  /* ---------- Ciclo de partida ---------- */

  reset() {
    this.map.reset();
    this.buildings.length = 0;
    this.enemies.clear();
    this.projectiles.clear();
    this.energy.clear();
    this.floats.clear();
    this.particles.clear();
    this.economy.reset(30);
    this.waves.reset();
    this.player.reset(this.map.cx, this.map.cy + 130);
    this.player.recalcStats(this.buildings);
    this.core.hp = this.core.maxHp;
    this.elapsed = 0;
    this.camera.x = this.map.cx;
    this.camera.y = this.map.cy;
    this.ui.closeBuildMenu();
    this.ui.closeBuildingPanel();
    this.cancelPlacement();
    this.ui.updateHud();
  }

  start() {
    this.reset();
    this.state = "playing";
    this.ui.hideOverlay();
    this.announce("Defenda o Núcleo Celular!");
  }

  startFromOverlay() {
    this.audio.unlock();
    this.start();
  }

  gameOver() {
    if (this.state === "over") return;
    this.state = "over";
    this.audio.over();
    const improved = Save.recordRun(this.waves.wave, this.elapsed);
    this.ui.showOverlay(
      "O Núcleo Celular sucumbiu",
      `Você sobreviveu ${formatTime(this.elapsed)} e resistiu até a invasão ${this.waves.wave} com ${
        this.buildings.length
      } organelos.` + (improved ? " Novo recorde!" : ""),
      "Jogar novamente"
    );
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.showOverlay("Pausado", "A célula aguarda seu comando.", "Continuar");
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.hideOverlay();
    }
  }

  /** Pausa leve usada pelos menus (não mostra overlay). */
  setPaused(on, soft = false) {
    if (!soft) return;
    if (on && this.state === "playing") this.state = "menu-pause";
    else if (!on && this.state === "menu-pause") this.state = "playing";
  }

  get running() {
    return this.state === "playing";
  }

  /* ---------- Construção ---------- */

  beginPlacement(typeId) {
    this.placingType = typeId;
    this.hoverCell = null;
    this.ui.showPlaceBar(typeId);
    this.setPaused(false, true);
  }

  cancelPlacement() {
    if (!this.placingType) return;
    this.placingType = null;
    this.hoverCell = null;
    this.ui.hidePlaceBar();
  }

  handleTap(sx, sy) {
    if (!this.running && this.state !== "menu-pause") return;
    const w = this.camera.screenToWorld(sx, sy);

    if (this.placingType) {
      const { gx, gy } = this.map.worldToCell(w.x, w.y);
      this.tryBuild(this.placingType, gx, gy);
      return;
    }

    const b = this.map.buildingAt(w.x, w.y);
    if (b) this.ui.openBuildingPanel(b);
    else this.ui.closeBuildingPanel();
  }

  tryBuild(typeId, gx, gy) {
    const def = getBuildingDef(typeId);
    if (!this.map.isBuildable(gx, gy)) {
      this.ui.toast("Local inválido");
      return;
    }
    const cost = new Building(def, gx, gy).buildCost();
    if (!this.economy.spend(cost)) {
      this.ui.toast("Energia insuficiente");
      return;
    }
    const building = new Building(def, gx, gy);
    this.buildings.push(building);
    this.map.place(building);
    this.player.recalcStats(this.buildings);
    this.audio.build();
    this.camera.shake(5, 0.15);
    this.spawnFloatText(building.x, building.y - 40, def.name + " formado", "#ffd479");
    for (let i = 0; i < 14; i++) this.particles.spawn(building.x, building.y, "#9ad0ff");
    this.cancelPlacement();
    this.ui.updateHud();
  }

  upgradeSelected() {
    const b = this.ui.selected;
    if (!b) return;
    const cost = b.upgradeCost();
    if (!this.economy.spend(cost)) {
      this.ui.toast("Energia insuficiente");
      return;
    }
    b.upgrade();
    this.player.recalcStats(this.buildings);
    this.audio.upgrade();
    for (let i = 0; i < 12; i++) this.particles.spawn(b.x, b.y, "#ffd479");
    this.spawnFloatText(b.x, b.y - 40, "Evolução " + b.level, "#ffd479");
    this.ui.renderBuildingPanel(b);
    this.ui.updateHud();
  }

  /* ---------- Spawns auxiliares ---------- */

  spawnProjectile(x, y, target, dmg, color, owner, crit) {
    this.projectiles.spawn(x, y, target, dmg, color, owner, crit);
  }

  spawnFloatText(x, y, text, color) {
    this.floats.spawn(x, y, text, color);
  }

  announce(text) {
    this.announceText = text;
    this.announceTime = 2.2;
  }

  damageCore(amount) {
    this.core.hp -= amount;
    this.camera.shake(6, 0.2);
    this.spawnFloatText(this.core.x, this.core.y - 50, "-" + Math.round(amount), "#ff6b6b");
    if (this.core.hp <= 0) {
      this.core.hp = 0;
      this.gameOver();
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.audio.hit();
    const drops = e.isBoss ? 8 : 1;
    for (let i = 0; i < drops; i++) {
      this.energy.spawn(e.x, e.y, Math.max(1, Math.round(e.reward / drops)));
    }
    for (let i = 0; i < (e.isBoss ? 26 : 8); i++) this.particles.spawn(e.x, e.y, e.def.color);
    if (e.isBoss) this.camera.shake(16, 0.4);
  }

  /* ---------- Loop ---------- */

  loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000 || 0, 0.05);
    this.lastTs = ts;

    if (this.running) this.update(dt);
    this.time += dt;
    this.render();

    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.elapsed += dt;
    this.core.pulse += dt;

    this.player.update(dt, this);
    this.waves.update(dt);

    for (const b of this.buildings) b.update(dt, this);

    // Inimigos
    for (const e of this.enemies.active) {
      if (!e.dead) updateEnemy(e, dt, this);
    }
    this.enemies.sweep();

    this.updateProjectiles(dt);
    this.updateEnergy(dt);

    // Textos e partículas
    for (const f of this.floats.active) {
      f.y -= 28 * dt;
      f.life -= dt;
      if (f.life <= 0) f.dead = true;
    }
    this.floats.sweep();

    for (const p of this.particles.active) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) p.dead = true;
    }
    this.particles.sweep();

    if (this.player.hp <= 0) {
      // O herói cai: penaliza o núcleo e renasce na base.
      this.player.hp = this.player.stats.maxHp * 0.5;
      this.player.x = this.map.cx;
      this.player.y = this.map.cy + 90;
      this.player.invuln = 2;
      this.damageCore(120);
      this.announce("Herói reconstituído — o Núcleo pagou o preço");
    }

    if (this.announceTime > 0) this.announceTime -= dt;

    this.camera.follow(this.player, dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.ui.updateHud();
    }
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles.active) {
      // Leve teleguiamento para acertar alvos em movimento
      if (p.target && !p.target.dead) {
        const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const sp = 620;
        p.vx += (Math.cos(a) * sp - p.vx) * Math.min(1, dt * 8);
        p.vy += (Math.sin(a) * sp - p.vy) * Math.min(1, dt * 8);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      for (const e of this.enemies.active) {
        if (e.dead) continue;
        if (dist2(p.x, p.y, e.x, e.y) < (e.radius + 5) * (e.radius + 5)) {
          e.hp -= p.dmg;
          e.hitFlash = 0.08;
          this.spawnFloatText(e.x, e.y - e.radius - 6, Math.round(p.dmg), p.crit ? "#ffd479" : "#e8f0ff");
          for (let i = 0; i < 3; i++) this.particles.spawn(p.x, p.y, p.color);
          p.dead = true;
          if (e.hp <= 0) this.killEnemy(e);
          break;
        }
      }
    }
    this.projectiles.sweep();
  }

  updateEnergy(dt) {
    const p = this.player;
    for (const c of this.energy.active) {
      c.life -= dt;
      if (c.life <= 0) {
        c.dead = true;
        continue;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= 0.9;
      c.vy *= 0.9;

      const d2 = dist2(c.x, c.y, p.x, p.y);
      if (d2 < 130 * 130) {
        const d = Math.sqrt(d2) || 1;
        const pull = 320 * dt;
        c.x += ((p.x - c.x) / d) * pull;
        c.y += ((p.y - c.y) / d) * pull;
      }
      if (d2 < 22 * 22) {
        c.dead = true;
        this.economy.add(c.value);
        this.audio.pickup();
        this.spawnFloatText(p.x, p.y - 30, "+" + c.value, "#6fe3ff");
      }
    }
    this.energy.sweep();
  }

  /* ---------- Render ---------- */

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.camera.vw, this.camera.vh);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, this.camera.vw, this.camera.vh);

    ctx.save();
    this.camera.apply(ctx);

    this.map.draw(ctx, this.camera);
    this.drawAmbient(ctx);
    if (this.placingType) this.map.drawPlacementGrid(ctx, this.camera, this.hoverCell);

    this.drawCore(ctx);

    // Edifícios ordenados por Y para dar profundidade
    const sorted = this.buildings;
    sorted.sort((a, b) => a.y - b.y);
    for (const b of sorted) b.draw(ctx, this.time);

    for (const c of this.energy.active) this.drawEnergy(ctx, c);
    for (const e of this.enemies.active) drawEnemy(ctx, e, this.time);
    this.player.draw(ctx, this.time);

    for (const p of this.projectiles.active) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.crit ? 6 : 4, 0, TAU);
      ctx.fill();
    }

    for (const p of this.particles.active) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const f of this.floats.active) {
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.fillStyle = f.color;
      ctx.font = "bold 14px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    this.drawAnnounce(ctx);
    this.drawMinimap(ctx);
  }

  /** Bolhas e ondas de energia lentas ao fundo. */
  drawAmbient(ctx) {
    const t = this.time;
    ctx.save();
    for (const p of this.ambient) {
      const y = p.y - ((t * p.sp) % this.map.height);
      const yy = y < 0 ? y + this.map.height : y;
      const x = p.x + Math.sin(t * 0.5 + p.phase) * 14;
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = "#9ad0ff";
      ctx.beginPath();
      ctx.arc(x, yy, p.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "rgba(160, 220, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawCore(ctx) {
    const c = this.core;
    const pulse = 1 + Math.sin(c.pulse * 2) * 0.05;
    const ratio = clamp(c.hp / c.maxHp, 0, 1);

    ctx.save();
    ctx.translate(c.x, c.y);

    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 190);
    g.addColorStop(0, `rgba(167, 139, 250, ${0.25 + ratio * 0.2})`);
    g.addColorStop(1, "rgba(167, 139, 250, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 190, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 16, 30, 0.6)";
    ctx.beginPath();
    ctx.ellipse(0, 30, 54, 20, 0, 0, TAU);
    ctx.fill();

    // Núcleo celular
    const nr = 46 * pulse;
    ctx.fillStyle = ratio > 0.35 ? "#a78bfa" : "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, nr, 0, TAU);
    ctx.fill();

    // Membrana nuclear
    ctx.strokeStyle = "rgba(230, 220, 255, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, nr, 0, TAU);
    ctx.stroke();

    // Cromatina interna
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (let i = 0; i < 5; i++) {
      const a = c.pulse * 0.4 + (i / 5) * TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * nr * 0.4, Math.sin(a) * nr * 0.35, 9, 6, a, 0, TAU);
      ctx.fill();
    }

    // Nucléolo
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(-6, -6, 12, 0, TAU);
    ctx.fill();

    // Anel de vida
    ctx.strokeStyle = "rgba(20,30,50,0.8)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = ratio > 0.35 ? "#a78bfa" : "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, 62, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
    ctx.stroke();

    ctx.restore();
  }

  drawEnergy(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = "rgba(111, 227, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#6fe3ff";
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawAnnounce(ctx) {
    if (this.announceTime <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.announceTime);
    ctx.fillStyle = "#ffd479";
    ctx.font = "bold 22px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.announceText, this.camera.vw / 2, this.camera.vh * 0.28);
    ctx.restore();
  }

  drawMinimap(ctx) {
    const size = 84;
    const pad = 10;
    const x = this.camera.vw - size - pad;
    const y = this.camera.vh - size - pad - 76;
    const sx = size / this.map.width;

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(8, 14, 26, 0.7)";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "rgba(120,170,230,0.3)";
    ctx.strokeRect(x, y, size, size);

    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(x + this.core.x * sx - 2, y + this.core.y * sx - 2, 4, 4);

    ctx.fillStyle = "#7ee0c0";
    for (const b of this.buildings) ctx.fillRect(x + b.x * sx - 1, y + b.y * sx - 1, 2, 2);

    ctx.fillStyle = "#ff6b6b";
    for (const e of this.enemies.active) ctx.fillRect(x + e.x * sx - 1, y + e.y * sx - 1, 2, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + this.player.x * sx - 2, y + this.player.y * sx - 2, 3, 3);
    ctx.restore();
  }
}
