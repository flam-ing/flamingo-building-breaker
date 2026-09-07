export const W = 1280,
  H = 720,
  FLOOR_HEIGHT = 116,
  TOWER_BOTTOM = 398,
  HERO_X = 636,
  HERO_GROUND = 602,
  FIXED_DT = 1 / 60;
export const SITES = [
  {
    name: "오래된 상가",
    english: "BRICK ARCADE",
    floors: 8,
    hp: 100,
    period: 4.8,
    warning: 1.35,
    kind: "brick",
    subtitle: "노란 경고 뒤 파편이 내려오면 ↓로 받아내세요.",
  },
  {
    name: "증기 공장",
    english: "STEAM WORKS",
    floors: 9,
    hp: 118,
    period: 3.2,
    warning: 1,
    kind: "girder",
    subtitle: "무거운 철골은 방어 게이지를 더 크게 깎는다.",
  },
  {
    name: "유리 관제탑",
    english: "GLASS SPIRE",
    floors: 10,
    hp: 132,
    period: 2.6,
    warning: 0.9,
    kind: "glass",
    subtitle: "세 번의 유리 파편을 모두 막고 반격하라.",
  },
];
const limit = (n, a, b) => Math.max(a, Math.min(b, n));
export function makeGame() {
  return {
    mode: "title",
    paused: false,
    stage: 0,
    floor: 0,
    floorHp: 100,
    floorMax: 100,
    floorHits: [],
    hearts: 3,
    guard: 100,
    energy: 15,
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    totalFloors: 0,
    parries: 0,
    elapsed: 0,
    stageClock: 150,
    clock: 0,
    modeTime: 0,
    collapse: 0,
    hitstop: 0,
    shake: 0,
    flash: 0,
    hero: {
      state: "idle",
      time: 0,
      action: null,
      guardAt: -99,
      guardLatch: 0,
      invincible: 0,
      charge: 0,
      lift: 0,
    },
    hazard: null,
    hazardClock: SITES[0].period,
    projectiles: [],
    debris: [],
    dust: [],
    events: [],
    buffer: null,
    bufferTime: 0,
    message: "",
    messageTime: 0,
    seed: 1994,
    id: 1,
  };
}
function tell(g, text, time = 1.5) {
  g.message = text;
  g.messageTime = time;
}
function signal(g, type, other = {}) {
  g.events.push({ type, ...other });
  if (g.events.length > 64) g.events.shift();
}
function rnd(g) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
export function start(g) {
  Object.assign(g, makeGame());
  enterSite(g, 0);
  return g;
}
function setupFloor(g) {
  const site = SITES[g.stage];
  const reinforced = (g.floor + 1) % 3 === 0;
  g.floorMax = site.hp + (reinforced ? 26 : 0);
  g.floorHp = g.floorMax;
  g.floorHits = [];
}
export function enterSite(g, index) {
  g.stage = index;
  g.floor = 0;
  g.mode = "intro";
  g.modeTime = 0;
  g.stageClock = 150;
  g.collapse = 0;
  g.hazard = null;
  g.projectiles = [];
  g.debris = [];
  g.dust = [];
  g.hero = {
    state: "idle",
    time: 0,
    action: null,
    guardAt: -99,
    guardLatch: 0,
    invincible: 0.5,
    charge: 0,
    lift: 0,
  };
  g.guard = 100;
  g.hazardClock = SITES[index].period;
  g.buffer = null;
  g.bufferTime = 0;
  g.hitstop = 0;
  setupFloor(g);
  tell(g, SITES[index].subtitle, 3);
}
export function continueSite(g) {
  if (g.mode !== "stageclear") return false;
  if (g.stage === 2) {
    g.mode = "victory";
    g.modeTime = 0;
    return true;
  }
  g.hearts = Math.min(3, g.hearts + 1);
  enterSite(g, g.stage + 1);
  return true;
}
function grit(g, x, y, count = 12, color = "sand") {
  for (let i = 0; i < count; i++) {
    g.dust.push({
      x,
      y,
      vx: (rnd(g) - 0.5) * 260,
      vy: -rnd(g) * 200 - 25,
      size: 3 + rnd(g) * 7,
      life: 0.4 + rnd(g) * 0.5,
      color,
    });
  }
  if (g.dust.length > 180) g.dust.splice(0, g.dust.length - 180);
}
function brokenFloor(g) {
  const material = g.stage;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 6; col++) {
      const x = 330 + (col + 0.5) * 103.33,
        y = TOWER_BOTTOM - FLOOR_HEIGHT + (row + 0.5) * 38.67;
      g.debris.push({
        id: g.id++,
        material,
        row,
        col,
        x,
        y,
        vx: (x - HERO_X) * 1.2 + (rnd(g) - 0.5) * 130,
        vy: -60 - rnd(g) * 170,
        angle: 0,
        spin: (rnd(g) - 0.5) * 5,
        life: 1.5,
        w: 104,
        h: 40,
      });
    }
  grit(g, HERO_X, TOWER_BOTTOM, 25);
  g.totalFloors++;
  g.floor++;
  g.score += 600 + Math.floor(g.combo * 15);
  g.collapse = 0.48;
  g.shake = 10;
  g.hazard = null;
  g.hazardClock = Math.max(g.hazardClock, 0.7);
  signal(g, "floor");
  if (g.floor >= SITES[g.stage].floors) {
    g.floorHp = 0;
    g.mode = "clearing";
    g.modeTime = 0;
    g.hero.action = null;
    g.hero.state = "victory";
    g.projectiles = [];
    g.hazard = null;
  } else setupFloor(g);
}
export function damageFloor(
  g,
  amount,
  { pierce = false, kind = "slash" } = {},
) {
  if (g.mode !== "play" || g.floor >= SITES[g.stage].floors) return 0;
  let left = Math.max(0, amount),
    done = 0;
  while (left > 0 && g.mode === "play") {
    const damage = Math.min(g.floorHp, left);
    g.floorHp -= damage;
    done += damage;
    left -= damage;
    g.floorHits.push({
      x: limit(0.45 + (rnd(g) - 0.5) * 0.43, 0.08, 0.92),
      y: 0.35 + rnd(g) * 0.55,
      kind,
      seed: rnd(g),
    });
    if (g.floorHits.length > 8) g.floorHits.shift();
    if (g.floorHp <= 0) {
      brokenFloor(g);
      if (!pierce) break;
    } else break;
  }
  g.score += Math.round(done * 8);
  return done;
}
export function beginAction(g, type) {
  if (g.mode !== "play" || g.collapse > 0) return false;
  const h = g.hero;
  if (type === "rise" && g.guard < 10) {
    tell(g, "방어 기력이 부족합니다");
    return false;
  }
  const spec =
    type === "rise"
      ? {
          duration: 0.57,
          strikeAt: 0.2,
          activeUntil: 0.38,
          pose: 2,
          damage: 32,
        }
      : {
          duration: 0.34,
          strikeAt: 0.105,
          activeUntil: 0.21,
          pose: 1,
          damage: 19 + Math.min(g.combo, 3) * 3,
        };
  if (type === "rise") g.guard -= 10;
  h.action = { type, time: 0, hit: false, ...spec };
  h.state = type;
  h.time = 0;
  signal(g, "swing", { type });
  return true;
}
function attackHit(g, a) {
  if (a.hit) return;
  a.hit = true;
  const reinforced = (g.floor + 1) % 3 === 0;
  let amount = a.damage;
  if (reinforced) {
    if (a.type === "rise") amount *= 1.22;
    else amount *= 0.6;
  }
  damageFloor(g, Math.round(amount), { kind: a.type });
  g.energy = limit(g.energy + 7, 0, 100);
  g.combo++;
  g.maxCombo = Math.max(g.combo, g.maxCombo);
  g.comboTimer = 1.4;
  g.hitstop = 0.035;
  g.shake = 3;
  grit(
    g,
    HERO_X + 35,
    TOWER_BOTTOM - 30,
    11,
    g.stage === 1 ? "metal" : "glass",
  );
  signal(g, "hit");
}
function releaseCharge(g) {
  const h = g.hero;
  if (h.state !== "charge") return;
  if (h.charge < 0.55) {
    h.state = "idle";
    h.charge = 0;
    tell(g, "X를 조금 더 길게 눌렀다 떼세요");
    return;
  }
  if (g.energy < 65) {
    h.state = "idle";
    h.charge = 0;
    tell(g, "필살 65 이상 필요 · 공격과 튕겨내기로 충전");
    return;
  }
  const charge = limit(h.charge / 1.25, 0, 1);
  g.energy -= 65;
  h.action = {
    type: "special",
    time: 0,
    strikeAt: 0.3,
    activeUntil: 0.72,
    duration: 0.95,
    pose: 6,
    damage: 95 + Math.round(charge * 65),
    hit: false,
  };
  h.state = "special";
  h.time = 0;
  h.invincible = 1.1;
  h.charge = 0;
  g.hazard = null;
  g.projectiles = [];
  signal(g, "special");
  tell(g, "일 도 양 단", 1.4);
}
function issueHazard(g) {
  const site = SITES[g.stage];
  g.hazard = { id: g.id++, kind: site.kind, time: 0, warning: site.warning };
  if (g.stage === 0 && g.parries === 0)
    tell(g, "노란 경고! 파편이 머리에 닿기 전에 ↓를 누르세요.", 2.4);
  signal(g, "warning");
}
function spawnProjectiles(g, hazard) {
  const kind = hazard.kind;
  const count = kind === "glass" ? 3 : 1;
  for (let i = 0; i < count; i++) {
    g.projectiles.push({
      id: g.id++,
      kind,
      x: HERO_X + (i - 1) * (kind === "glass" ? 21 : 0),
      y: TOWER_BOTTOM - 14 - i * 64,
      vy: kind === "girder" ? 180 : 140,
      size: kind === "girder" ? 58 : kind === "glass" ? 15 : 28,
      spin: rnd(g) * 2,
      life: 3,
      hit: false,
    });
  }
  signal(g, "fall");
}
function guardImpact(g, p) {
  const h = g.hero;
  const perfect = h.state === "guard" && g.clock - h.guardAt < 0.19;
  const cost = p.kind === "girder" ? 35 : p.kind === "glass" ? 15 : 25;
  if (h.state === "guard" && g.guard >= cost) {
    if (perfect) {
      g.parries++;
      g.energy = limit(g.energy + 19, 0, 100);
      g.guard = limit(g.guard + 7, 0, 100);
      g.combo++;
      g.maxCombo = Math.max(g.combo, g.maxCombo);
      g.comboTimer = 1.6;
      g.score += 350;
      damageFloor(g, p.kind === "girder" ? 27 : 18, { kind: "parry" });
      tell(g, "받아치기!  +350", 0.8);
      signal(g, "parry");
    } else {
      g.guard -= cost;
      g.energy = limit(g.energy + 4, 0, 100);
      tell(g, "방어", 0.45);
      signal(g, "block");
    }
    grit(g, HERO_X, 500, 10, "metal");
    p.hit = true;
    g.shake = 3;
    return;
  }
  if (
    h.action?.type === "rise" &&
    h.action.time > h.action.strikeAt &&
    h.action.time < h.action.activeUntil
  ) {
    p.hit = true;
    g.energy = limit(g.energy + 12, 0, 100);
    g.score += 150;
    grit(g, HERO_X, 475, 12, "metal");
    tell(g, "베어내기!", 0.65);
    signal(g, "parry");
    return;
  }
  if (h.invincible > 0) {
    p.hit = true;
    return;
  }
  p.hit = true;
  g.hearts = Math.max(0, g.hearts - 1);
  g.guard = Math.max(g.guard, 30);
  g.combo = 0;
  g.comboTimer = 0;
  h.action = null;
  h.state = "hurt";
  h.time = 0;
  h.invincible = 1.0;
  h.charge = 0;
  g.buffer = null;
  g.shake = 13;
  grit(g, HERO_X, 515, 16, "hurt");
  signal(g, "hurt");
  if (g.hearts === 0) {
    g.mode = "defeat";
    g.modeTime = 0;
    tell(g, "세 번의 충격을 견디지 못했습니다.", 9);
  }
}
export function tick(g, input = {}, dt = FIXED_DT) {
  if (!Number.isFinite(dt) || dt <= 0 || g.paused) return;
  dt = Math.min(0.05, dt);
  g.clock += dt;
  g.modeTime += dt;
  if (g.mode === "intro") {
    if (g.modeTime > 2.4 || input.confirm) {
      g.mode = "play";
      g.modeTime = 0;
    }
    return;
  }
  if (g.mode === "clearing") {
    for (const d of g.debris) {
      d.x += d.vx * dt;
      d.vy += 1350 * dt;
      d.y += d.vy * dt;
      d.angle += d.spin * dt;
      d.life -= dt;
    }
    if (g.modeTime > 1.6) {
      g.mode = "stageclear";
      g.modeTime = 0;
      signal(g, "clear");
    }
    return;
  }
  if (g.mode !== "play") return;
  g.elapsed += dt;
  g.stageClock = Math.max(0, g.stageClock - dt);
  if (g.stageClock === 0) {
    g.mode = "defeat";
    tell(g, "작전 시간이 끝났습니다.", 9);
    return;
  }
  g.collapse = Math.max(0, g.collapse - dt);
  g.comboTimer = Math.max(0, g.comboTimer - dt);
  if (g.comboTimer === 0) g.combo = 0;
  g.bufferTime = Math.max(0, g.bufferTime - dt);
  if (!g.bufferTime) g.buffer = null;
  g.messageTime = Math.max(0, g.messageTime - dt);
  g.shake = Math.max(0, g.shake - dt * 34);
  g.flash = Math.max(0, g.flash - dt * 4);
  const h = g.hero;
  h.invincible = Math.max(0, h.invincible - dt);
  h.time += dt;
  g.guard = limit(g.guard + (h.state === "guard" ? -6 : 17) * dt, 0, 100);
  for (const d of g.debris) {
    d.x += d.vx * dt;
    d.vy += 1350 * dt;
    d.y += d.vy * dt;
    d.angle += d.spin * dt;
    d.life -= dt;
  }
  g.debris = g.debris.filter((d) => d.life > 0 && d.y < 850);
  for (const p of g.dust) {
    p.x += p.vx * dt;
    p.vy += 480 * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  g.dust = g.dust.filter((p) => p.life > 0 && p.y < 740);
  h.guardLatch = Math.max(0, (h.guardLatch || 0) - dt);
  if (input.guardPressed && h.state !== "hurt" && h.state !== "special") {
    h.guardAt = g.clock;
    h.guardLatch = 0.12;
    h.state = "guard";
    h.action = null;
    h.charge = 0;
    h.time = 0;
    h.lift = 0;
    g.buffer = null;
  }
  const guarding = input.guardHeld || h.guardLatch > 0;
  if (guarding && h.state !== "hurt" && h.state !== "special") {
    h.state = "guard";
    h.action = null;
    h.charge = 0;
    h.lift = 0;
  }
  if (!guarding && h.state === "guard") {
    h.state = "idle";
    h.time = 0;
  }
  if (input.slash || input.rise) {
    g.buffer = input.rise ? "rise" : "slash";
    g.bufferTime = 0.34;
  }
  if (g.hitstop > 0) {
    g.hitstop -= dt;
    return;
  }
  if (h.state === "hurt") {
    if (h.time > 0.34) h.state = "idle";
  } else if (h.action) {
    const a = h.action;
    a.time += dt;
    h.lift =
      a.type === "rise"
        ? Math.sin(Math.min(1, a.time / a.duration) * Math.PI) * 40
        : a.type === "special"
          ? Math.sin(Math.min(1, a.time / a.duration) * Math.PI) * 140
          : 0;
    if (a.time >= a.strikeAt && !a.hit) {
      if (a.type === "special") {
        a.hit = true;
        damageFloor(g, a.damage, { pierce: true, kind: "special" });
        g.shake = 14;
        g.hitstop = 0.075;
        g.flash = 0.2;
        grit(g, HERO_X, TOWER_BOTTOM, 30, "special");
        signal(g, "specialHit");
      } else attackHit(g, a);
    }
    if (a.time > a.duration) {
      h.action = null;
      h.state = "idle";
      h.lift = 0;
    }
  } else if (h.state === "charge") {
    if (input.chargeHeld) h.charge = Math.min(1.4, h.charge + dt);
    if (input.chargeReleased || !input.chargeHeld) releaseCharge(g);
  } else if (h.state !== "guard") {
    h.state = "idle";
    h.lift = 0;
    if (input.chargePressed || (input.chargeHeld && g.energy >= 65)) {
      if (g.energy >= 65) {
        h.state = "charge";
        h.charge = 0;
        h.time = 0;
        if (input.chargeReleased) releaseCharge(g);
      } else tell(g, "필살 65 이상 필요 · 공격과 받아치기로 충전");
    } else if (g.buffer && g.collapse === 0) {
      const type = g.buffer;
      g.buffer = null;
      beginAction(g, type);
    }
  }
  if (g.mode !== "play") return;
  g.hazardClock -= dt;
  if (!g.hazard && g.hazardClock <= 0 && g.collapse === 0) {
    issueHazard(g);
    g.hazardClock = SITES[g.stage].period;
  }
  if (g.hazard) {
    g.hazard.time += dt;
    if (g.hazard.time >= g.hazard.warning) {
      spawnProjectiles(g, g.hazard);
      g.hazard = null;
    }
  }
  for (const p of g.projectiles) {
    p.vy += p.kind === "girder" ? 1150 * dt : 1650 * dt;
    p.y += p.vy * dt;
    p.spin += dt * 4;
    p.life -= dt;
    if (!p.hit && p.y >= 487 - h.lift * 0.25) guardImpact(g, p);
  }
  g.projectiles = g.projectiles.filter(
    (p) => !p.hit && p.life > 0 && p.y < 740,
  );
}
// Blur, pause, restart and site changes share one release boundary. No deferred
// attack may leak across it, but an already-started attack can resume its phase.
export function clearControls(g, keys, ticker) {
  keys.clear();
  ticker.reset();
  g.buffer = null;
  g.bufferTime = 0;
  g.hero.guardLatch = 0;
  if (g.hero.state === "charge" || g.hero.state === "guard") {
    g.hero.state = "idle";
    g.hero.charge = 0;
    g.hero.lift = 0;
  }
}
export class KeyBuffer {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
  }
  down(key) {
    if (!this.held.has(key)) this.pressed.add(key);
    this.held.add(key);
  }
  up(key) {
    if (this.held.has(key) || this.pressed.has(key)) this.released.add(key);
    this.held.delete(key);
  }
  sample() {
    return {
      slash: this.pressed.has("slash"),
      rise: this.pressed.has("rise"),
      guardPressed: this.pressed.has("guard"),
      guardHeld: this.held.has("guard"),
      chargePressed: this.pressed.has("charge"),
      chargeHeld: this.held.has("charge"),
      chargeReleased: this.released.has("charge"),
      confirm: this.pressed.has("confirm"),
    };
  }
  consume() {
    this.pressed.clear();
    this.released.clear();
  }
  clear() {
    this.held.clear();
    this.consume();
  }
}
export class FixedTicker {
  constructor(run) {
    this.run = run;
    this.reset();
  }
  reset() {
    this.previous = null;
    this.accumulator = 0;
  }
  frame(ms, input) {
    if (this.previous === null) {
      this.previous = ms;
      return 0;
    }
    this.accumulator += Math.min(
      0.15,
      Math.max(0, (ms - this.previous) / 1000),
    );
    this.previous = ms;
    let n = 0;
    while (this.accumulator + 1e-9 >= FIXED_DT && n < 9) {
      this.run(
        n === 0
          ? input
          : {
              ...input,
              slash: false,
              rise: false,
              guardPressed: false,
              chargePressed: false,
              chargeReleased: false,
              confirm: false,
            },
        FIXED_DT,
      );
      this.accumulator -= FIXED_DT;
      n++;
    }
    return n;
  }
}
