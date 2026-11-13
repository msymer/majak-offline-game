// Screen layout: portrait or landscape, optionally forced.
// iOS cannot lock the orientation of a web app, so a forced orientation turns the whole app by 90°
// with CSS and all touch coordinates are converted back ("local" coordinates of #app).

export const layout = { rot: false, w: 0, h: 0, vw: 0, land: false, mode: 'auto' };
let appEl = null;

export function initLayout(app) { appEl = app; installRotScroll(app); }

export function applyLayout(mode = layout.mode) {
  layout.mode = mode;
  const vw = window.innerWidth, vh = window.innerHeight;
  const physLand = vw > vh;
  const wantLand = mode === 'landscape' ? true : mode === 'portrait' ? false : physLand;
  const rot = mode !== 'auto' && wantLand !== physLand;
  layout.rot = rot;
  layout.vw = vw;
  layout.w = rot ? vh : vw;
  layout.h = rot ? vw : vh;
  layout.land = layout.w > layout.h;
  const st = appEl.style;
  if (rot) {
    st.inset = 'auto'; st.left = '0'; st.top = '0';
    st.width = vh + 'px'; st.height = vw + 'px';
    st.transformOrigin = '0 0';
    st.transform = `translate(${vw}px, 0) rotate(90deg)`;
  } else {
    st.inset = ''; st.left = ''; st.top = ''; st.width = ''; st.height = ''; st.transform = ''; st.transformOrigin = '';
  }
  st.setProperty('--lw', layout.w + 'px');
  st.setProperty('--lh', layout.h + 'px');
  appEl.classList.toggle('rot', rot);
  appEl.classList.toggle('land', layout.land);
  appEl.classList.toggle('port', !layout.land);
  appEl.classList.toggle('short', layout.h < 620);
  return layout;
}

// Screen (client) coordinates -> coordinates inside #app.
export function toLocal(cx, cy) {
  return layout.rot ? { x: cy, y: layout.vw - cx } : { x: cx, y: cy };
}

// Rectangle of an element in local coordinates.
export function localRect(el) {
  const r = el.getBoundingClientRect();
  if (!layout.rot) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  const a = toLocal(r.left, r.top), b = toLocal(r.right, r.bottom);
  const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

// In a turned app the browser would scroll lists along the wrong axis, so lists are dragged by hand there.
function installRotScroll(root) {
  let cur = null;
  root.addEventListener('pointerdown', (e) => {
    if (!layout.rot) return;
    const el = e.target.closest?.('.scroll, .scrollx');
    if (!el) return;
    const p = toLocal(e.clientX, e.clientY);
    cur = { el, x: p.x, y: p.y, id: e.pointerId, moved: 0 };
  }, true);
  root.addEventListener('pointermove', (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    const p = toLocal(e.clientX, e.clientY);
    const dx = p.x - cur.x, dy = p.y - cur.y;
    cur.x = p.x; cur.y = p.y; cur.moved += Math.abs(dx) + Math.abs(dy);
    if (cur.el.classList.contains('scrollx') && !appEl.classList.contains('land')) cur.el.scrollLeft -= dx; else cur.el.scrollTop -= dy;
  }, true);
  const end = (e) => { if (cur && e.pointerId === cur.id) cur = null; };
  root.addEventListener('pointerup', end, true);
  root.addEventListener('pointercancel', end, true);
}
