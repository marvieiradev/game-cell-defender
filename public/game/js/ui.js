// Camada de interface DOM: HUD, menus e overlays.

import { allBuildingDefs, getBuildingDef, levelCost } from "./building.js";
import { formatTime } from "./utils.js";
import { Save } from "./save.js";

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      crystals: $("hud-crystals"),
      wave: $("hud-wave"),
      time: $("hud-time"),
      barPlayer: $("bar-player"),
      barCore: $("bar-core"),
      txtPlayer: $("txt-player"),
      txtCore: $("txt-core"),
      buildMenu: $("build-menu"),
      buildList: $("build-list"),
      panel: $("building-panel"),
      bpName: $("bp-name"),
      bpBody: $("bp-body"),
      btnUpgrade: $("btn-upgrade"),
      placeBar: $("place-bar"),
      placeText: $("place-text"),
      overlay: $("overlay"),
      ovTitle: $("ov-title"),
      ovText: $("ov-text"),
      ovRecords: $("ov-records"),
      btnOverlay: $("btn-overlay"),
      btnSound: $("btn-sound"),
      toast: $("toast"),
    };
    this.selected = null;
    this.toastTimer = 0;
    this.bind();
  }

  bind() {
    $("btn-build").onclick = () => this.openBuildMenu();
    $("btn-build-close").onclick = () => this.closeBuildMenu();
    $("btn-bp-close").onclick = () => this.closeBuildingPanel();
    $("btn-place-cancel").onclick = () => this.game.cancelPlacement();
    $("btn-pause").onclick = () => this.game.togglePause();
    this.el.btnUpgrade.onclick = () => this.game.upgradeSelected();
    this.el.btnOverlay.onclick = () => this.game.startFromOverlay();
    this.el.btnSound.onclick = () => {
      const on = !this.game.audio.enabled;
      this.game.audio.setEnabled(on);
      this.el.btnSound.textContent = "Som: " + (on ? "ligado" : "desligado");
    };
    this.el.btnSound.textContent = "Som: " + (this.game.audio.enabled ? "ligado" : "desligado");
  }

  /* ---------- HUD ---------- */

  updateHud() {
    const g = this.game;
    this.el.crystals.textContent = g.economy.crystals;
    this.el.wave.textContent = g.waves.wave || 1;
    this.el.time.textContent = formatTime(g.elapsed);

    const p = g.player;
    const php = Math.max(0, p.hp);
    this.el.barPlayer.style.width = (php / p.stats.maxHp) * 100 + "%";
    this.el.txtPlayer.textContent = `${Math.ceil(php)}/${Math.round(p.stats.maxHp)}`;

    const c = g.core;
    this.el.barCore.style.width = (Math.max(0, c.hp) / c.maxHp) * 100 + "%";
    this.el.txtCore.textContent = `${Math.ceil(Math.max(0, c.hp))}/${c.maxHp}`;

    if (this.el.panel.classList.contains("hidden") === false && this.selected) {
      this.renderBuildingPanel(this.selected);
    }
    if (!this.el.buildMenu.classList.contains("hidden")) this.refreshBuildCosts();
  }

  toast(msg) {
    this.el.toast.textContent = msg;
    this.el.toast.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.el.toast.classList.add("hidden"), 1600);
  }

  /* ---------- Menu de organelos ---------- */

  openBuildMenu() {
    this.closeBuildingPanel();
    this.game.cancelPlacement();
    this.el.buildList.innerHTML = "";
    for (const def of allBuildingDefs()) {
      const cost = levelCost(1, def.costMult);
      const btn = document.createElement("button");
      btn.className = "card";
      btn.dataset.cost = cost;
      btn.innerHTML = `
        <div class="card-top"><span class="glyph">${def.glyph}</span>${def.name}</div>
        <div class="desc">${def.desc}</div>
        <div class="bonus">${def.perLevelText}</div>
        <div class="cost">⚡ ${cost}</div>`;
      btn.onclick = () => {
        this.closeBuildMenu();
        this.game.beginPlacement(def.id);
      };
      this.el.buildList.appendChild(btn);
    }
    this.refreshBuildCosts();
    this.el.buildMenu.classList.remove("hidden");
    this.game.setPaused(true, true);
  }

  refreshBuildCosts() {
    const crystals = this.game.economy.crystals;
    for (const card of this.el.buildList.children) {
      card.disabled = crystals < Number(card.dataset.cost);
    }
  }

  closeBuildMenu() {
    this.el.buildMenu.classList.add("hidden");
    if (!this.game.placingType) this.game.setPaused(false, true);
  }

  /* ---------- Modo de posicionamento ---------- */

  showPlaceBar(defId) {
    const def = getBuildingDef(defId);
    this.el.placeText.textContent = `${def.glyph} ${def.name} — toque numa área livre`;
    this.el.placeBar.classList.remove("hidden");
  }

  hidePlaceBar() {
    this.el.placeBar.classList.add("hidden");
  }

  /* ---------- Painel do organelo ---------- */

  openBuildingPanel(building) {
    this.selected = building;
    this.renderBuildingPanel(building);
    this.el.panel.classList.remove("hidden");
  }

  renderBuildingPanel(b) {
    const def = b.def;
    const cost = b.upgradeCost();
    this.el.bpName.textContent = `${def.glyph} ${def.name}`;
    this.el.bpBody.innerHTML = `
      <div class="stat-row"><span>Evolução</span><span>${b.level}</span></div>
      <div class="stat-row"><span>Bônus atual</span><span>${def.bonusText(b.level)}</span></div>
      <div class="stat-row"><span>Próxima evolução</span><span>${def.bonusText(b.level + 1)}</span></div>
      <div class="stat-row"><span>Custo</span><span>⚡ ${cost}</span></div>`;
    this.el.btnUpgrade.textContent = `Evoluir — ⚡ ${cost}`;
    this.el.btnUpgrade.disabled = !this.game.economy.can(cost);
  }

  closeBuildingPanel() {
    this.selected = null;
    this.el.panel.classList.add("hidden");
  }

  /* ---------- Overlay ---------- */

  showOverlay(title, text, buttonLabel) {
    this.el.ovTitle.textContent = title;
    this.el.ovText.textContent = text;
    this.el.btnOverlay.textContent = buttonLabel;
    this.el.ovRecords.textContent = `Recorde: Invasão ${Save.data.bestWave} · ${formatTime(
      Save.data.bestTime
    )}`;
    this.el.overlay.classList.remove("hidden");
  }

  hideOverlay() {
    this.el.overlay.classList.add("hidden");
  }
}
