// Colours and chapter moods. Warm = the player's, cool = the mist's.
export const C = {
  cream: 0xF4E9D8, amber: 0xFFB347, orange: 0xF28C38, coral: 0xE8604C, brass: 0xC9A227, wood: 0x6B4A3A,
  woodLight: 0x8F6449, oak: 0xCFA273, wallStone: 0xEADBC0, red: 0xD9513C, iron: 0x4B4652,
  grassL: 0x8FCB6B, grassD: 0x5FA052, soil: 0x9C6B4A, soilD: 0x7A5139, stoneL: 0x8D8F98, stoneD: 0x5C5F6B, moss: 0x7DB565,
  waterS: 0x4FB3BF, waterD: 0x2B7A8C, ore: 0xD98B3A, oreDot: 0xFFD86B, mud: 0x6E5A4E, crystal: 0x9FE8FF,
  sliz: 0x3EC9A7, smejdil: 0xB6E04A, tlustoch: 0x2A9C86, golden: 0xFFD23F,
  plech: 0x6C8BA8, rust: 0xB5553C, mist: 0xDDE6F5, ink: 0x1D2A3A,
  gold: 0xFFD86B, white: 0xFFFFFF, ice: 0xBFEFFF, ok: 0x9DFF7A,
  copper: 0xB5763C, felcar: 0x8A5FB0, bahnak: 0x7A5A62, pulec: 0x5E7A3E, mudMom: 0x6E5A4E, heal: 0x7BE36B, zap: 0xFFF2A8,
};

// Light direction: az = degrees around the island (0 = from the camera side, negative = from the left),
// el = degrees above the horizon.
export const MOODS = {
  1: { top: 0x8ED0F0, horizon: 0xE8F4FA, sun: 0xFFF1D6, sunI: 2.5, az: -62, el: 40, hemiI: 1.0, ground: 0xB7A07A, beam: 0.5, lamp: 0.7, mist: 0xF4F9FD, exposure: 1.0 },
  2: { top: 0x6FB7E8, horizon: 0xF3E7C9, sun: 0xFFFFFF, sunI: 2.9, az: -25, el: 72, hemiI: 1.0, ground: 0xC9B48A, beam: 0.4, lamp: 0.6, mist: 0xF6EFDc, exposure: 1.0 },
  3: { top: 0x7A7FA6, horizon: 0xC9B8C4, sun: 0xD9C7E0, sunI: 1.7, az: 50, el: 42, hemiI: 1.2, ground: 0x8A7A80, beam: 0.9, lamp: 1.0, mist: 0xD6C9D2, exposure: 1.0 },
  4: { top: 0xF0965A, horizon: 0xFFD9A0, sun: 0xFF9A4D, sunI: 2.6, az: 72, el: 17, hemiI: 1.0, ground: 0xA8704A, beam: 0.9, lamp: 1.0, mist: 0xFFDDB0, exposure: 1.0 },
  5: { top: 0x3E4A78, horizon: 0x8F9CC4, sun: 0x9AA8E0, sunI: 1.15, az: -40, el: 35, hemiI: 1.0, ground: 0x5A5F80, beam: 1.6, lamp: 1.3, mist: 0x9CA8CC, exposure: 1.0 },
  6: { top: 0x141A3A, horizon: 0x2E3A66, sun: 0xAFC4FF, sunI: 1.0, az: -55, el: 50, hemiI: 0.7, ground: 0x232A4A, beam: 2.4, lamp: 1.6, mist: 0x36426E, exposure: 1.05 },
  7: { top: 0x1E2233, horizon: 0x3A4055, sun: 0x8E9BB8, sunI: 0.85, az: 30, el: 55, hemiI: 0.72, ground: 0x2C3040, beam: 2.4, lamp: 1.6, mist: 0x424960, exposure: 1.05 },
  8: { top: 0x0E1022, horizon: 0x241A2A, sun: 0x7F86B0, sunI: 0.6, az: -30, el: 60, hemiI: 0.52, ground: 0x5A2A1A, beam: 2.8, lamp: 1.8, mist: 0x2A2032, exposure: 1.1 },
  9: { top: 0x3A1F5A, horizon: 0x7A3F8F, sun: 0xE0A0FF, sunI: 1.3, az: 60, el: 38, hemiI: 0.75, ground: 0x5A2F70, beam: 1.6, lamp: 1.4, mist: 0x8A4FA0, exposure: 1.0 },
  // after the end: dawn (epilogue and the title screen)
  11: { top: 0x9AD0F5, horizon: 0xFFD9A0, sun: 0xFFE2B0, sunI: 2.2, az: 70, el: 14, hemiI: 1.0, ground: 0xB7A07A, beam: 0.3, lamp: 0.6, mist: 0xFFE9CC, exposure: 1.0 },
  10: { top: 0x05060F, horizon: 0x12142A, sun: 0x6F78A8, sunI: 0.3, az: -45, el: 55, hemiI: 0.34, ground: 0x0C0E1C, beam: 3.4, lamp: 2.2, mist: 0x161930, exposure: 1.15 },
};
