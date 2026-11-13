// Simple inline SVG icons. Warm colours = player, cool colours = the mist's creatures.
import { MORE_ICONS } from './icons-more.js';
import { LATE_ICONS } from './icons-late.js';
const svg = (body, vb = '0 0 32 32') => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const eyes = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x1 + 0.5}" cy="${y + 0.5}" r="${r * 0.5}" fill="#1D2A3A"/><circle cx="${x2 + 0.5}" cy="${y + 0.5}" r="${r * 0.5}" fill="#1D2A3A"/>`;

export const ICONS = {
  light: svg('<path d="M20 12l10-5v11z" fill="#FFB347" opacity=".55"/><path d="M12 29h8l-1.4-15h-5.2z" fill="#D9513C"/><path d="M12.75 21h6.5l.35 4h-7.2z" fill="#F4E9D8"/><rect x="11.5" y="9" width="9" height="5" rx="1" fill="#FFB347"/><path d="M10 9.5L16 3l6 6.5z" fill="#6B4A3A"/><rect x="10" y="28" width="12" height="2.5" rx="1" fill="#8D8F98"/>'),
  gold: svg('<circle cx="16" cy="16" r="12" fill="#C9A227"/><circle cx="16" cy="16" r="9.5" fill="#FFD86B"/><path d="M16 9.5v13M12.5 13h7M12.5 19h7" stroke="#C9A227" stroke-width="2.2" stroke-linecap="round"/>'),
  menu: svg('<path d="M7 10h18M7 16h18M7 22h18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>'),
  pause: svg('<rect x="9" y="8" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="18" y="8" width="5" height="16" rx="1.5" fill="currentColor"/>'),
  play: svg('<path d="M10 7l15 9-15 9z" fill="currentColor"/>'),
  close: svg('<path d="M9 9l14 14M23 9L9 23" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'),
  back: svg('<path d="M19 7l-9 9 9 9" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  undo: svg('<path d="M11 8L5 14l6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 14h12a7 7 0 010 14h-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  lock: svg('<rect x="8" y="14" width="16" height="12" rx="3" fill="#8D8F98"/><path d="M11.5 14v-3a4.5 4.5 0 019 0v3" fill="none" stroke="#8D8F98" stroke-width="3"/><circle cx="16" cy="20" r="2" fill="#FBF3E4"/>'),
  merge: svg('<path d="M8 6v6a6 6 0 006 6h4a6 6 0 006-6V6M16 18v8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M11.5 22.5L16 27l4.5-4.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  sell: svg('<circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 10.5v11M13 13.5h6M13 18.5h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  target: svg('<circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="3.5" fill="currentColor"/><path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  auto: svg('<path d="M25 13a9.5 9.5 0 10.4 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M26 5v8h-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  path: svg('<circle cx="6" cy="7" r="2.6" fill="#F28C38"/><circle cx="14" cy="7" r="2.6" fill="#F28C38"/><circle cx="22" cy="9" r="2.6" fill="#F28C38"/><circle cx="24" cy="17" r="2.6" fill="#F28C38"/><circle cx="17" cy="21" r="2.6" fill="#F28C38"/><circle cx="10" cy="25" r="2.6" fill="#F28C38"/>'),
  tile: svg('<path d="M16 5l12 7-12 7-12-7z" fill="#8FCB6B"/><path d="M4 12v6l12 7v-6z" fill="#5FA052"/><path d="M28 12v6l-12 7v-6z" fill="#9C6B4A"/>'),
  card: svg('<rect x="5" y="7" width="15" height="21" rx="3" fill="#F28C38" transform="rotate(-10 12 17)"/><rect x="12" y="5" width="15" height="21" rx="3" fill="#FFD86B" stroke="#C9A227" stroke-width="1.5" transform="rotate(8 19 15)"/>'),
  eye: svg('<path d="M3 16c4-7 9-10 13-10s9 3 13 10c-4 7-9 10-13 10S7 23 3 16z" fill="#F4E9D8" stroke="#6B4A3A" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="#F28C38"/><circle cx="16" cy="16" r="2.2" fill="#3B2F2F"/>'),
  flag: svg('<path d="M9 28V4" stroke="#6B4A3A" stroke-width="3" stroke-linecap="round"/><path d="M10 5h15l-4 5.5 4 5.5H10z" fill="#F28C38"/>'),
  speed: svg('<path d="M4 8l11 8-11 8zM16 8l11 8-11 8z" fill="#F28C38"/>'),
  save: svg('<rect x="5" y="5" width="22" height="22" rx="4" fill="#C9A227"/><rect x="10" y="5" width="12" height="8" fill="#F4E9D8"/><rect x="9" y="17" width="14" height="10" rx="1.5" fill="#6B4A3A"/>'),
  heart: svg('<path d="M16 27C6 20 4 15 4 11.5A6.5 6.5 0 0116 8a6.5 6.5 0 0112 3.5C28 15 26 20 16 27z" fill="#E8604C"/>'),
  book: svg('<path d="M5 7c4-2 8-2 11 0v19c-3-2-7-2-11 0z" fill="#F4E9D8" stroke="#6B4A3A" stroke-width="2" stroke-linejoin="round"/><path d="M27 7c-4-2-8-2-11 0v19c3-2 7-2 11 0z" fill="#FFD9A0" stroke="#6B4A3A" stroke-width="2" stroke-linejoin="round"/>'),
  gear: svg('<path d="M16 3l2.2 3.6 4-1.2 1 4.1 4 1.2-1.8 3.8 2.4 3.4-3.5 2.2.2 4.2-4.2.3L18 28.6 16 25l-2 3.6-2.3-3.6-4.2-.3.2-4.2-3.5-2.2 2.4-3.4L4.8 11l4-1.200 1-4.100 4 1.200z" fill="currentColor"/><circle cx="16" cy="16" r="4.5" fill="#FBF3E4"/>'),
  note: svg('<path d="M12 23V7l13-3v16" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><ellipse cx="9" cy="23" rx="4" ry="3.2" fill="currentColor"/><ellipse cx="22" cy="20" rx="4" ry="3.2" fill="currentColor"/>'),
  quill: svg('<path d="M26 4c-9 1-15 7-17 16l-3 8 3-1c9-2 15-8 17-23z" fill="#F4E9D8" stroke="#6B4A3A" stroke-width="2" stroke-linejoin="round"/><path d="M7 26L20 11" stroke="#6B4A3A" stroke-width="2" stroke-linecap="round"/>'),
  home: svg('<path d="M4 16L16 5l12 11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 15v12h16V15" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>'),
  question: svg('<circle cx="16" cy="16" r="13" fill="#D9CDB8"/><path d="M11.5 12.500a4.500 4.500 0 118 2.800c-1.500 1.500-3.500 2-3.500 4.700" fill="none" stroke="#FBF3E4" stroke-width="3.2" stroke-linecap="round"/><circle cx="16" cy="24.500" r="2" fill="#FBF3E4"/>'),

  // Buildings
  wall: svg('<rect x="4" y="13" width="24" height="14" rx="2" fill="#EADBC0"/><path d="M4 9h6v5H4zM13 9h6v5h-6zM22 9h6v5h-6z" fill="#F4E9D8"/><path d="M4 20h24M12 14v6M20 20v7" stroke="#C9B48F" stroke-width="1.6"/>'),
  archer: svg('<path d="M10 29l1.5-15h9L22 29z" fill="#F4E9D8"/><path d="M10 29l1.5-15h2L12.500 29zM22 29l-1.500-15h-2l1 15z" fill="#8F6449"/><rect x="8" y="11" width="16" height="4" rx="1" fill="#6B4A3A"/><path d="M6 8h20" stroke="#6B4A3A" stroke-width="3" stroke-linecap="round"/><path d="M23 2c4 3 4 9 0 12" fill="none" stroke="#C9A227" stroke-width="3" stroke-linecap="round"/><path d="M5 5l4 3-4 3z" fill="#F28C38"/>'),
  cannon: svg('<path d="M5 17c0-2 22-2 22 0l1 9c0 3-24 3-24 0z" fill="#8F6449"/><path d="M4.500 20.500h23M4.200 24.500h23.600" stroke="#C9A227" stroke-width="2.200"/><path d="M12 13l13-8 3.500 5.500-13 8z" fill="#4B4652"/><path d="M23.500 6l3-1.800 3.500 5.500-3 1.800z" fill="#C9A227"/><circle cx="13" cy="16" r="4.500" fill="#4B4652"/>'),
  frost: svg('<path d="M9 29l2-10h10l2 10z" fill="#EADBC0"/><rect x="9.500" y="17" width="13" height="3" rx="1" fill="#C9A227"/><path d="M16 1l6 7.500-6 7.500-6-7.500z" fill="#9FE8FF"/><path d="M16 1l6 7.500H10z" fill="#D8F7FF"/><path d="M5 9l2 2.500-2 2.500-2-2.500zM27 6l2 2.500-2 2.500-2-2.500z" fill="#9FE8FF"/>'),
  mine: svg('<rect x="4" y="15" width="17" height="12" fill="#8F6449"/><path d="M2 16.500L21 9v6z" fill="#F28C38"/><path d="M2 16.500L21 9l1 3L3 19z" fill="#F28C38"/><rect x="9" y="19" width="6" height="8" fill="#3B2F2F"/><path d="M26 28V8M26 9h-5" stroke="#6B4A3A" stroke-width="2.600" stroke-linecap="round"/><rect x="18" y="23" width="9" height="5" rx="1" fill="#6B4A3A"/><path d="M19 23l1.500-2.500h6L28 23z" fill="#FFD86B"/>'),
  lightning: svg('<rect x="13" y="16" width="6" height="13" fill="#B5763C"/><ellipse cx="16" cy="19" rx="8" ry="2.200" fill="none" stroke="#C9A227" stroke-width="2.200"/><ellipse cx="16" cy="24" rx="9" ry="2.400" fill="none" stroke="#C9A227" stroke-width="2.200"/><circle cx="16" cy="9" r="6.500" fill="#FFD86B"/><path d="M17.500 4l-4 5.500h3l-1.500 4.500 4.500-6h-3z" fill="#fff"/>'),
  amplifier: svg('<path d="M16 16L8 29M16 16l8 13M16 16v13" stroke="#6B4A3A" stroke-width="2.600" stroke-linecap="round"/><path d="M5 8c2 9 20 9 22 0z" fill="#C9A227"/><circle cx="16" cy="7" r="3.500" fill="#FFB347"/>'),
  trap: svg('<path d="M3 22h26l-3 6H6z" fill="#8D8F98"/><path d="M7 22l2.500-9 2.500 9zM13.500 22L16 11l2.500 11zM20 22l2.500-9 2.500 9z" fill="#F4E9D8" stroke="#8D8F98" stroke-width="1"/>'),
  teleport: svg('<ellipse cx="16" cy="20" rx="13" ry="7" fill="#8D8F98"/><ellipse cx="16" cy="19" rx="9.500" ry="4.800" fill="#3B2F2F"/><path d="M10 19c2-4 10-4 12 0-2 2-5 2-6 0" fill="none" stroke="#FFB347" stroke-width="2.200" stroke-linecap="round"/>'),
  bank: svg('<path d="M3 12L16 4l13 8z" fill="#F28C38"/><rect x="5" y="12" width="22" height="3" fill="#F4E9D8"/><path d="M7 15h3.500v10H7zM14.200 15h3.600v10h-3.600zM21.500 15H25v10h-3.500z" fill="#F4E9D8"/><rect x="4" y="25" width="24" height="4" rx="1" fill="#EADBC0"/><circle cx="16" cy="9" r="2.400" fill="#FFD86B"/>'),

  // Enemies
  sliz: svg(`<path d="M4 26c0-11 4.500-17 12-17s12 6 12 17z" fill="#3EC9A7"/><ellipse cx="11" cy="13.500" rx="3" ry="1.800" fill="#fff" opacity=".45"/>${eyes(12, 20, 19, 3.2)}`),
  smejdil: svg(`<path d="M4 26c0-7 3-11 9-12.500L10 4l10 9c5 2 8 6 8 13z" fill="#B6E04A"/>${eyes(13, 20.500, 20, 3)}`),
  tlustoch: svg(`<path d="M2 27c0-14 5-21 14-21s14 7 14 21z" fill="#2A9C86"/><circle cx="9" cy="14" r="2" fill="#8FE6D2"/><circle cx="23" cy="12" r="1.500" fill="#8FE6D2"/><circle cx="20" cy="23" r="1.700" fill="#8FE6D2"/>${eyes(13, 19, 17, 2)}`),
  velky_sliz: svg(`<path d="M2 28c0-13 5-20 14-20s14 7 14 20z" fill="#24A98C"/><path d="M10 9l1.500-6.500 3 4L16 2l1.500 4.500 3-4L22 9z" fill="#DDE6F5"/>${eyes(11.500, 20.500, 18, 3.300)}`),
  stredni_sliz: svg(`<path d="M4 27c0-11 4.500-17 12-17s12 6 12 17z" fill="#2DB796"/>${eyes(12, 20, 19, 3)}`),
  maly_sliz: svg(`<path d="M7 26c0-8 3.500-12 9-12s9 4 9 12z" fill="#38C4A2"/>${eyes(13, 19, 20.500, 2.600)}`),
  golden: svg(`<path d="M4 26c0-11 4.500-17 12-17s12 6 12 17z" fill="#FFD23F"/>${eyes(12, 20, 19, 3.200)}<path d="M25 3l1.200 2.800L29 7l-2.800 1.200L25 11l-1.200-2.800L21 7l2.800-1.200z" fill="#fff"/>`),

  // Knot
  knot: svg('<rect x="8" y="17" width="16" height="12" rx="3" fill="#F4E9D8"/><rect x="8" y="21" width="16" height="2.600" fill="#C9A227"/><circle cx="16" cy="12" r="7.500" fill="#F4E9D8"/><circle cx="13" cy="12.500" r="2.300" fill="#FFB347"/><circle cx="19" cy="12.500" r="2.300" fill="#FFB347"/><rect x="14" y="2.500" width="4" height="3" fill="#FFB347"/><path d="M12.500 3L16 0l3.500 3z" fill="#D9513C"/><rect x="6.500" y="10.500" width="2" height="3" rx="1" fill="#C9A227"/><rect x="23.500" y="10.500" width="2" height="3" rx="1" fill="#C9A227"/>'),
  strike: svg('<path d="M9 26L20 12" stroke="#C9A227" stroke-width="4.500" stroke-linecap="round"/><path d="M17 9l3-5 3 1.500-1.500 3L26 11l1.500-3L30 10l-4.500 6z" fill="#C9A227"/><path d="M4 14l3 1M6 8l2.500 2.500M12 5l1 3" stroke="#F28C38" stroke-width="2.200" stroke-linecap="round"/>'),
};

Object.assign(ICONS, MORE_ICONS, LATE_ICONS);

export function enemyIcon(type, golden) {
  if (golden) return ICONS.golden;
  return ICONS[type] || ICONS.sliz;
}
