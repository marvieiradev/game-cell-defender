// Entrada unificada: teclado (WASD/setas), joystick virtual e toques/cliques.

export class Input {
  constructor(canvas, joystickEl) {
    this.canvas = canvas;
    this.joystickEl = joystickEl;
    this.knob = joystickEl.querySelector(".joystick-knob");
    this.keys = new Set();
    this.joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.tapHandler = null;
    this.hoverHandler = null;
    this.maxRadius = 46;

    this.bindKeyboard();
    this.bindPointer();
  }

  bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()))
        e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
  }

  bindPointer() {
    const c = this.canvas;

    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      const isTouch = e.pointerType !== "mouse";
      const leftZone = e.clientX < window.innerWidth * 0.5;

      if (isTouch && leftZone && !this.tapOnlyMode) {
        this.startJoystick(e);
      } else if (!isTouch && e.button === 0) {
        this.pendingTap = { x: e.clientX, y: e.clientY, moved: false };
      } else if (isTouch) {
        this.pendingTap = { x: e.clientX, y: e.clientY, moved: false };
      }
    });

    c.addEventListener("pointermove", (e) => {
      if (this.joy.active && this.joy.id === e.pointerId) {
        this.moveJoystick(e);
      }
      if (this.pendingTap) {
        const dx = e.clientX - this.pendingTap.x;
        const dy = e.clientY - this.pendingTap.y;
        if (dx * dx + dy * dy > 200) this.pendingTap.moved = true;
      }
      if (this.hoverHandler && e.pointerType === "mouse") {
        this.hoverHandler(e.clientX, e.clientY);
      }
    });

    const end = (e) => {
      if (this.joy.active && this.joy.id === e.pointerId) this.endJoystick();
      if (this.pendingTap && !this.pendingTap.moved && this.tapHandler) {
        this.tapHandler(e.clientX, e.clientY);
      }
      this.pendingTap = null;
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  startJoystick(e) {
    this.joy.active = true;
    this.joy.id = e.pointerId;
    this.joy.ox = e.clientX;
    this.joy.oy = e.clientY;
    this.joy.dx = 0;
    this.joy.dy = 0;
    this.joystickEl.style.left = e.clientX - 60 + "px";
    this.joystickEl.style.top = e.clientY - 60 + "px";
    this.joystickEl.classList.remove("hidden");
    this.knob.style.transform = "translate(0px, 0px)";
  }

  moveJoystick(e) {
    let dx = e.clientX - this.joy.ox;
    let dy = e.clientY - this.joy.oy;
    const len = Math.hypot(dx, dy);
    if (len > this.maxRadius) {
      dx = (dx / len) * this.maxRadius;
      dy = (dy / len) * this.maxRadius;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const n = Math.max(len, 0.0001);
    const mag = Math.min(len / this.maxRadius, 1);
    this.joy.dx = ((e.clientX - this.joy.ox) / n) * mag;
    this.joy.dy = ((e.clientY - this.joy.oy) / n) * mag;
  }

  endJoystick() {
    this.joy.active = false;
    this.joy.id = null;
    this.joy.dx = 0;
    this.joy.dy = 0;
    this.joystickEl.classList.add("hidden");
  }

  /** Vetor de movimento normalizado (8 direções via teclado). */
  moveVector() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has("a") || k.has("arrowleft")) x -= 1;
    if (k.has("d") || k.has("arrowright")) x += 1;
    if (k.has("w") || k.has("arrowup")) y -= 1;
    if (k.has("s") || k.has("arrowdown")) y += 1;

    if (x === 0 && y === 0 && this.joy.active) {
      x = this.joy.dx;
      y = this.joy.dy;
      if (Math.hypot(x, y) < 0.15) return ZERO;
      return { x, y };
    }

    const len = Math.hypot(x, y);
    if (len === 0) return ZERO;
    return { x: x / len, y: y / len };
  }

  onTap(fn) {
    this.tapHandler = fn;
  }

  onHover(fn) {
    this.hoverHandler = fn;
  }
}

const ZERO = { x: 0, y: 0 };
