// Touch / mouse gestures on the game canvas:
// tap, long press (0.3 s), one-finger pan, two-finger pinch, drag of a selected building (merge).
// All coordinates are converted to the app's own ("local") coordinates, so a turned app works too.
import { toLocal } from './layout.js';

const MOVE_TOL = 10;
const LONG_PRESS = 300;
const DOUBLE_TAP = 320;

export class Input {
  constructor(canvas, view, handlers) {
    this.canvas = canvas;
    this.view = view;
    this.h = handlers;
    this.pointers = new Map();
    this.lastTap = { t: 0, x: -1, y: -1 };
    this.enabled = true;

    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.cancel(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const l = toLocal(e.clientX, e.clientY);
      this.view.zoomAt(Math.exp(e.deltaY * 0.0015), l.x, l.y);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(e) {
    if (!this.enabled) return;
    this.canvas.setPointerCapture?.(e.pointerId);
    const l = toLocal(e.clientX, e.clientY);
    this.pointers.set(e.pointerId, { x: l.x, y: l.y });
    if (this.pointers.size === 1) {
      const cell = this.view.screenToCell(l.x, l.y);
      this.g = { id: e.pointerId, sx: l.x, sy: l.y, t: performance.now(), moved: false, long: false, cell, mode: null };
      this.h.pressStart?.(l);
      // Drag of a selected building starts a merge drag.
      if (cell && this.h.canDragFrom?.(cell)) this.g.dragCandidate = true;
      clearTimeout(this.lpTimer);
      this.lpTimer = setTimeout(() => {
        if (this.g && !this.g.moved && this.pointers.size === 1) {
          this.g.long = true;
          if (cell) this.h.longPress?.(cell);
        }
      }, LONG_PRESS);
    } else if (this.pointers.size === 2) {
      clearTimeout(this.lpTimer);
      if (this.g) { this.g.moved = true; this.g.mode = 'pinch'; if (this.g.dragging) this.h.dragCancel?.(); this.g.dragging = false; }
      this.pinch = this.pinchInfo();
    }
  }

  pinchInfo() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const l = toLocal(e.clientX, e.clientY);
    const dx = l.x - p.x, dy = l.y - p.y;
    p.x = l.x; p.y = l.y;
    if (this.pointers.size >= 2) {
      const now = this.pinchInfo();
      if (this.pinch && now.d > 0) {
        this.view.zoomAt(this.pinch.d / now.d, now.cx, now.cy);
        this.view.pan(now.cx - this.pinch.cx, now.cy - this.pinch.cy);
      }
      this.pinch = now;
      return;
    }
    const g = this.g;
    if (g && g.long) this.h.holdMove?.(l);
    if (!g || g.long) return;
    if (!g.moved && Math.hypot(l.x - g.sx, l.y - g.sy) > MOVE_TOL) {
      g.moved = true;
      clearTimeout(this.lpTimer);
      if (g.dragCandidate) { g.dragging = true; this.h.dragStart?.(g.cell); }
    }
    if (!g.moved) return;
    if (g.dragging) this.h.dragMove?.(this.view.screenToCell(l.x, l.y));
    else this.view.pan(dx, dy);
  }

  up(e) {
    const g = this.g;
    const l = toLocal(e.clientX, e.clientY);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 1) { this.pinch = null; return; }
    if (this.pointers.size > 0) return;
    clearTimeout(this.lpTimer);
    this.pinch = null;
    if (!g) return;
    this.g = null;
    if (g.mode !== 'pinch') this.h.pressEnd?.(l, performance.now() - g.t);
    if (g.dragging) { this.h.dragEnd?.(this.view.screenToCell(l.x, l.y)); return; }
    if (g.moved || g.long || g.mode === 'pinch') return;
    const cell = this.view.screenToCell(l.x, l.y);
    const now = performance.now();
    const dbl = now - this.lastTap.t < DOUBLE_TAP && cell && cell.x === this.lastTap.x && cell.y === this.lastTap.y;
    this.lastTap = { t: now, x: cell ? cell.x : -1, y: cell ? cell.y : -1 };
    if (dbl) this.h.doubleTap?.(cell, l);
    this.h.tap?.(cell, l);
  }

  cancel(e) {
    this.pointers.delete(e.pointerId);
    clearTimeout(this.lpTimer);
    if (this.g?.dragging) this.h.dragCancel?.();
    this.g = null;
    this.pinch = null;
  }
}
