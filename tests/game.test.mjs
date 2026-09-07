import test from "node:test";
import assert from "node:assert/strict";
import {
  makeGame,
  start,
  tick,
  continueSite,
  enterSite,
  damageFloor,
  beginAction,
  KeyBuffer,
  FixedTicker,
  clearControls,
  SITES,
} from "../src/game.mjs";

const fresh = () => {
  const g = start(makeGame());
  tick(g, { confirm: true });
  return g;
};
const steps = (g, n, input = {}) => {
  for (let i = 0; i < n; i++) tick(g, input);
};
const until = (g, predicate, input = {}, limit = 1200) => {
  for (let i = 0; i < limit && !predicate(g); i++) tick(g, input);
  assert.ok(predicate(g), "condition reached within bounded simulation");
};

test("title, introduction and first site initialize without attacks", () => {
  const g = makeGame();
  assert.equal(g.mode, "title");
  start(g);
  assert.equal(g.mode, "intro");
  steps(g, 30, { slash: true });
  assert.equal(g.floorHp, 100);
  tick(g, { confirm: true });
  assert.equal(g.mode, "play");
  assert.equal(g.hearts, 3);
});
test("quick 8ms attack press is retained until a fixed step and consumed once", () => {
  const keys = new KeyBuffer(),
    seen = [],
    t = new FixedTicker((i) => seen.push(i));
  t.frame(0, keys.sample());
  keys.down("slash");
  keys.up("slash");
  if (t.frame(8, keys.sample())) keys.consume();
  if (t.frame(17, keys.sample())) keys.consume();
  t.frame(34, keys.sample());
  assert.equal(seen[0].slash, true);
  assert.equal(seen[1].slash, false);
});
test("held key repeat creates no repeated press edges", () => {
  const k = new KeyBuffer();
  k.down("rise");
  k.consume();
  k.down("rise");
  assert.equal(k.sample().rise, false);
  k.up("rise");
  k.down("rise");
  assert.equal(k.sample().rise, true);
});
test("catch-up caps at nine steps and retains holds but not repeated edges", () => {
  const seen = [],
    t = new FixedTicker((i) => seen.push(i));
  t.frame(0, {});
  assert.equal(t.frame(100000, { slash: true, guardHeld: true }), 9);
  assert.equal(seen.filter((i) => i.slash).length, 1);
  assert.ok(seen.every((i) => i.guardHeld));
  t.reset();
  assert.equal(t.frame(200000, {}), 0);
});
test("slash has anticipation, one impact, and recovery with no repeat damage", () => {
  const g = fresh();
  tick(g, { slash: true });
  steps(g, 5);
  assert.equal(g.floorHp, 100);
  steps(g, 4);
  assert.equal(g.floorHp, 81);
  assert.equal(g.floorHits.length, 1);
  steps(g, 23);
  assert.equal(g.floorHp, 81);
  assert.equal(g.hero.state, "idle");
});
test("press during hitstop survives until recovery", () => {
  const g = fresh();
  tick(g, { slash: true });
  until(g, (g) => g.hitstop > 0);
  tick(g, { rise: true });
  steps(g, 48);
  assert.ok(g.floorHp < 81);
  assert.equal(g.energy, 29);
});
test("reinforced floors favor rising strike and rising costs defense energy", () => {
  const a = fresh(),
    b = fresh();
  damageFloor(a, 200, { pierce: true });
  damageFloor(b, 200, { pierce: true });
  steps(a, 31);
  steps(b, 31);
  assert.equal(a.floor, 2);
  assert.equal(a.floorMax, 126);
  beginAction(a, "slash");
  beginAction(b, "rise");
  assert.equal(b.guard, 90);
  steps(a, 16);
  steps(b, 22);
  assert.equal(a.floorHp, 115);
  assert.equal(b.floorHp, 87);
});
test("a broken floor creates material-matched debris and a real descent interval", () => {
  const g = fresh();
  damageFloor(g, 100);
  assert.equal(g.totalFloors, 1);
  assert.equal(g.debris.length, 18);
  assert.ok(g.debris.every((d) => d.material === 0));
  assert.equal(g.collapse, 0.48);
  assert.equal(beginAction(g, "slash"), false);
  steps(g, 31);
  assert.equal(g.collapse, 0);
  assert.equal(beginAction(g, "slash"), true);
});
test("ordinary damage stops at one floor; charged damage can pierce", () => {
  const a = fresh(),
    b = fresh();
  damageFloor(a, 150);
  damageFloor(b, 150, { pierce: true });
  assert.equal(a.floorHp, 100);
  assert.equal(b.floorHp, 50);
  assert.equal(a.floor, 1);
  assert.equal(b.floor, 1);
});
test("beginner first site allows at least 15 seconds without any input", () => {
  const g = fresh();
  until(g, (g) => g.mode === "defeat", {}, 2000);
  assert.ok(g.elapsed >= 15);
  assert.ok(g.elapsed < 20);
  assert.equal(g.hearts, 0);
});
test("first falling object has explicit warning and defense hint before harm", () => {
  const g = fresh();
  until(g, (g) => g.hazard !== null);
  assert.equal(g.hearts, 3);
  assert.match(g.message, /↓/);
  assert.ok(g.hazard.warning >= 1.3);
  assert.equal(g.projectiles.length, 0);
  steps(g, 50);
  assert.equal(g.hearts, 3);
  assert.ok(g.hazard);
});
test("quick press/release guard catches a near-impact object and expires", () => {
  const g = fresh();
  until(g, (g) => g.projectiles.some((p) => p.y > 447));
  const keys = new KeyBuffer();
  keys.down("guard");
  keys.up("guard");
  tick(g, keys.sample());
  keys.consume();
  steps(g, 8);
  assert.equal(g.hearts, 3);
  assert.equal(g.parries, 1);
  assert.ok(g.energy >= 34);
  assert.equal(g.hero.state, "idle");
  assert.ok(g.floorHp < 100);
});
test("held early guard spends energy and does not falsely count perfect parry", () => {
  const g = fresh();
  until(g, (g) => g.hazard !== null);
  tick(g, { guardPressed: true, guardHeld: true });
  until(g, (g) => g.energy > 15, { guardHeld: true });
  assert.equal(g.hearts, 3);
  assert.equal(g.parries, 0);
  assert.ok(g.guard < 80);
});
test("insufficient defense allows damage instead of invincible held guard", () => {
  const g = fresh();
  until(g, (g) => g.projectiles.some((p) => p.y > 430));
  g.guard = 0;
  tick(g, { guardPressed: true, guardHeld: true });
  steps(g, 20, { guardHeld: true });
  assert.equal(g.hearts, 2);
});
test("hurting player cannot cancel recovery with another guard press", () => {
  const g = fresh();
  until(g, (g) => g.hearts === 2);
  tick(g, { guardPressed: true, guardHeld: true });
  assert.equal(g.hero.state, "hurt");
});
test("all three sites have distinct warning kinds, counts and resource costs", () => {
  assert.deepEqual(
    SITES.map((s) => s.kind),
    ["brick", "girder", "glass"],
  );
  assert.deepEqual(
    SITES.map((s) => s.floors),
    [8, 9, 10],
  );
  for (let i = 0; i < 3; i++) {
    const g = fresh();
    enterSite(g, i);
    tick(g, { confirm: true });
    until(g, (g) => g.projectiles.length > 0);
    assert.equal(g.projectiles.length, i === 2 ? 3 : 1);
    assert.ok(g.projectiles.every((p) => p.kind === SITES[i].kind));
  }
});
test("short charge cancels without spending energy or damage", () => {
  const g = fresh();
  g.energy = 100;
  tick(g, { chargePressed: true, chargeHeld: true });
  steps(g, 15, { chargeHeld: true });
  tick(g, { chargeReleased: true });
  assert.equal(g.energy, 100);
  assert.equal(g.floorHp, 100);
  assert.equal(g.hero.state, "idle");
});
test("full charge spends exactly65, strikes once, pierces and protects its recovery", () => {
  const g = fresh();
  g.energy = 100;
  tick(g, { chargePressed: true, chargeHeld: true });
  steps(g, 76, { chargeHeld: true });
  tick(g, { chargeReleased: true });
  assert.equal(g.energy, 35);
  assert.equal(g.hero.state, "special");
  steps(g, 23);
  assert.equal(g.floor, 1);
  assert.equal(g.floorHp, 40);
  const score = g.score;
  steps(g, 45);
  assert.equal(g.score, score);
  assert.equal(g.hero.state, "idle");
});
test("quick same-frame X press/release cannot create an accidental special", () => {
  const g = fresh();
  g.energy = 100;
  const k = new KeyBuffer();
  k.down("charge");
  k.up("charge");
  tick(g, k.sample());
  assert.equal(g.hero.state, "idle");
  assert.equal(g.energy, 100);
});
test("paused simulation freezes every field despite queued commands", () => {
  const g = fresh();
  g.paused = true;
  const old = structuredClone(g);
  steps(g, 200, {
    slash: true,
    guardHeld: true,
    guardPressed: true,
    chargeHeld: true,
  });
  assert.deepEqual(g, old);
});
test("blur/pause input clear removes latch, charge and deferred attack safely", () => {
  const g = fresh(),
    k = new KeyBuffer(),
    t = new FixedTicker(() => {});
  g.energy = 100;
  k.down("charge");
  tick(g, k.sample());
  g.buffer = "slash";
  g.bufferTime = 0.3;
  g.hero.guardLatch = 0.12;
  t.frame(99, {});
  clearControls(g, k, t);
  assert.equal(g.hero.state, "idle");
  assert.equal(g.hero.charge, 0);
  assert.equal(g.hero.guardLatch, 0);
  assert.equal(g.buffer, null);
  assert.equal(t.previous, null);
  assert.ok(Object.values(k.sample()).every((v) => !v));
});
test("restart clears defeat, score, timer, enemies and all progression", () => {
  const g = fresh();
  until(g, (g) => g.mode === "defeat");
  start(g);
  assert.equal(g.mode, "intro");
  assert.equal(g.stage, 0);
  assert.equal(g.hearts, 3);
  assert.equal(g.stageClock, 150);
  assert.equal(g.score, 0);
  assert.equal(g.totalFloors, 0);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.hero.charge, 0);
});
test("time limit fails cleanly; invalid delta never corrupts state", () => {
  const g = fresh();
  const old = structuredClone(g);
  for (const dt of [NaN, Infinity, -1, 0]) tick(g, {}, dt);
  assert.deepEqual(g, old);
  g.stageClock = 0.01;
  tick(g);
  assert.equal(g.mode, "defeat");
  assert.equal(g.stageClock, 0);
});
test("ordinary input policy clears all27 floors with no state mutations or cheats", () => {
  const g = start(makeGame());
  let wasGuard = false,
    wasCharge = false,
    chargeFrames = 0;
  const clears = [];
  for (let frame = 0; frame < 60 * 440; frame++) {
    if (g.mode === "stageclear") {
      clears.push(g.stage);
      continueSite(g);
    }
    if (["victory", "defeat"].includes(g.mode)) break;
    const guard = g.projectiles.some((p) => p.y > 410);
    let charge = false,
      release = false,
      press = false;
    if (wasCharge) {
      chargeFrames++;
      charge = !guard && chargeFrames < 65;
      release = !charge;
    } else if (
      !guard &&
      g.energy >= 65 &&
      g.hero.state === "idle" &&
      !g.hazard &&
      g.hazardClock > 1.5 &&
      !g.projectiles.length
    ) {
      charge = true;
      press = true;
      chargeFrames = 0;
    }
    tick(g, {
      confirm: true,
      guardHeld: guard,
      guardPressed: guard && !wasGuard,
      chargeHeld: charge,
      chargePressed: press,
      chargeReleased: release,
      slash: !guard && !charge && frame % 24 === 0 && (g.floor + 1) % 3 !== 0,
      rise: !guard && !charge && frame % 38 === 0 && (g.floor + 1) % 3 === 0,
    });
    wasGuard = guard;
    wasCharge = charge;
  }
  assert.equal(g.mode, "victory");
  assert.deepEqual(clears, [0, 1, 2]);
  assert.equal(g.totalFloors, 27);
  assert.ok(g.hearts > 0);
  assert.ok(g.parries > 0);
  assert.ok(g.elapsed < 150);
  console.log(
    `ordinary-input win: ${g.elapsed.toFixed(2)}s, ${g.score} points, ${g.hearts} hearts, ${g.parries} parries`,
  );
});
