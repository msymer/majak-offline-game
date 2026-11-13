// Small DOM and formatting helpers shared by the interface modules.
export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, html = '') {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  if (html) e.innerHTML = html;
  return e;
}

export function fmt(n) { return Math.floor(n).toLocaleString('cs-CZ').replace(/ /g, ' '); }

export function fmtTime(sec) {
  sec = Math.round(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ' min ' + String(s).padStart(2, '0') + ' s';
}

// Number with a decimal comma and without trailing zeros.
export function num(v, d = 1) {
  let s = v.toFixed(d);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}
