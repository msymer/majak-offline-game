// General rules: economy, light, hero. Default values from the spec.

export const STEP = 1 / 30;            // fixed simulation step in seconds
export const SPEEDS = [1, 2, 4, 8];

export const ECONOMY = {
  startGold: 120,
  waveRewardBase: 15,
  waveRewardPerWave: 3,
  calledBonus: 1.25,                   // reward x1.25 for a wave called early
  interestRate: 0.04,
  interestCapBase: 40,
  interestCapPerChapter: 10,
  sellBuild: 1.0,
  sellCombat: 0.7,
};

export const LIGHT = {
  max: 100,
  bossDefeatBonus: 10,
};

export const AUTO_START_DELAY = 3;    // seconds after the previous wave ends

export const HERO = {
  speed: 3,
  hp: 100,
  attackRange: 1.2,
  attackDmg: 12,
  attackRate: 1.2,
  auraRange: 2,
  auraBonus: 0.15,
  downTime: 15,
  springRange: 2,
  springHeal: 12,                      // hp per second near the spring
  bossTouch: 0.8,                      // bosses hurt Knot within this distance
  strike: { radius: 1.5, dmg: 40, stun: 1.5, bossStun: 0.5, cooldown: 20 },
  plug: { time: 6, cooldown: 40, hold: 0.95 },
  overload: { time: 8, cooldown: 60, mul: 2 },
  maxLevel: 25,
  xpPerKill: 1,
  revealRange: 2.5,                    // Knot sees invisible enemies this close
  blockDps: 4,                         // hurt per second from every enemy he blocks
  thermosHeal: 10,
};

// Hero's abilities unlock after these waves.
export const ABILITY_UNLOCK = { strike: 0, plug: 25, overload: 70 };

// Lighthouse beam: one turn in this many seconds, half width (radians), reach (cells), reveal time.
export const BEAM = { period: 12, halfWidth: 0.24, reach: 8, reveal: 2, hitCooldown: 1.5 };
