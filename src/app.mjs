import "./style.css";
import {
  makeGame,
  start,
  continueSite,
  clearControls,
  tick,
  KeyBuffer,
  FixedTicker,
  SITES,
} from "./game.mjs";
import { makePainter } from "./paint.mjs";

const canvas = document.querySelector("#battle"),
  ctx = canvas.getContext("2d");
const menus = document.querySelector("#menus"),
  status = document.querySelector("#live-status");
const pauseButton = document.querySelector("#pause-toggle"),
  audioButton = document.querySelector("#audio-toggle"),
  motionButton = document.querySelector("#motion-toggle");
const keys = new KeyBuffer(),
  game = makeGame();
let painter,
  lastUI = "",
  muted = true,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  raf = 0,
  audio;
const lifecycle = new AbortController();
const on = (target, event, handler) =>
  target.addEventListener(event, handler, { signal: lifecycle.signal });
const ticker = new FixedTicker((input, dt) => tick(game, input, dt));
const createCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const load = (path) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error(`이미지를 읽지 못했습니다: ${path}`));
    image.src = path;
  });
function sound(type) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume();
    const o = audio.createOscillator(),
      a = audio.createGain(),
      t = audio.currentTime;
    const notes = {
      hit: 170,
      floor: 60,
      parry: 920,
      block: 270,
      hurt: 95,
      warning: 570,
      special: 310,
      specialHit: 82,
      clear: 680,
    };
    if (!notes[type]) return;
    o.type = ["floor", "hurt", "specialHit"].includes(type)
      ? "sawtooth"
      : "triangle";
    o.frequency.setValueAtTime(notes[type], t);
    o.frequency.exponentialRampToValueAtTime(
      type === "parry" ? 1500 : Math.max(30, notes[type] * 0.4),
      t + 0.13,
    );
    a.gain.setValueAtTime(0.075, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    o.connect(a);
    a.connect(audio.destination);
    o.start(t);
    o.stop(t + 0.2);
  } catch {
    muted = true;
    audioButton.textContent = "소리 OFF";
  }
}
function clearInput() {
  clearControls(game, keys, ticker);
}
function setPause(value) {
  if (!["play", "intro"].includes(game.mode)) return;
  game.paused = value;
  clearInput();
  refresh();
}
function launch() {
  start(game);
  clearInput();
  lastUI = "";
  refresh();
  canvas.focus({ preventScroll: true });
}
function title() {
  Object.assign(game, makeGame());
  clearInput();
  refresh();
}
function stats() {
  return `<div class="results"><div><strong>${game.score.toLocaleString()}</strong><small>점수</small></div><div><strong>${game.totalFloors}</strong><small>격파한 층</small></div><div><strong>${game.parries}</strong><small>받아치기</small></div></div>`;
}
function refresh() {
  const ui = game.mode + (game.paused ? "-paused" : "");
  if (ui === lastUI) return;
  lastUI = ui;
  document.body.classList.toggle(
    "in-battle",
    game.mode === "play" && !game.paused,
  );
  pauseButton.hidden = !["play", "intro"].includes(game.mode);
  pauseButton.textContent = game.paused ? "계속하기" : "일시정지";
  let html = "";
  if (game.paused)
    html = `<section class="menu shade"><span class="stage-stamp">PAUSED</span><h2>칼을 잠시 내려놓고</h2><p>화면을 벗어나면 작전도 멈춥니다.<br>계속하기 또는 Esc로 돌아오세요.</p><div class="buttons"><button class="start-button" data-action="resume">계속하기</button><button class="start-button secondary" data-action="title">처음으로</button></div></section>`;
  else if (game.mode === "title")
    html = `<section class="menu"><div class="title-panel"><div class="serial">FLAMINGO / DEMOLITION 01</div><h1>플라밍고<br>건물부수기</h1><p>빌딩은 높고, 칼날은 하나.<br>베고, 받아치고, 한 번에 무너뜨려라.</p><div class="buttons"><button class="start-button" data-action="start">작전 시작</button><button class="start-button secondary" data-action="help">조작법</button></div></div><div class="edition">SINGLE PLAYER · THREE SITES · ORIGINAL PARODY</div></section>`;
  else if (game.mode === "help")
    html = `<section class="menu shade"><span class="stage-stamp">FIELD MANUAL</span><h2>무너지기 직전, 받아쳐라</h2><div class="instructions"><div><kbd>Z · 연속 베기</kbd>짧게 반복해서 공격</div><div><kbd>↑ · 상승 베기</kbd>보강층에 강한 공격</div><div><kbd>↓ · 방어</kbd>누르는 동안 방어</div><div><kbd>X · 필살</kbd>누르고 충전 → 떼기</div></div><p>노란 경고 뒤 파편이 떨어집니다. 닿기 직전에 ↓를 누르면<br>기력 소모 없이 받아치고 필살 게이지를 빠르게 채웁니다.</p><p>필살은 게이지 65 이상에서 X를 0.55초 이상 눌러 발동합니다.<br>상승 베기는 방어 기력 10을 사용합니다. 각 건물 제한 시간은 150초.</p><div class="buttons"><button class="start-button" data-action="start">이제 시작</button><button class="start-button secondary" data-action="title">돌아가기</button></div></section>`;
  else if (game.mode === "stageclear")
    html = `<section class="menu shade"><span class="stage-stamp">SITE 0${game.stage + 1} / COMPLETE</span><h2>${SITES[game.stage].name} 철거 완료</h2>${stats()}<p>${game.stage < 2 ? "다음 현장으로 이동합니다. 목숨 하나와 방어 기력을 회복합니다." : "세 현장을 모두 정리했습니다."}</p><div class="buttons"><button class="start-button" data-action="next">${game.stage < 2 ? "다음 현장" : "최종 결과"}</button></div></section>`;
  else if (game.mode === "victory")
    html = `<section class="menu shade"><span class="stage-stamp">ALL 27 FLOORS / COMPLETE</span><h2>오늘의 도시 정리, 끝!</h2>${stats()}<p>최대 ${game.maxCombo}연속 베기 · 작전 시간 ${Math.round(game.elapsed)}초<br>칼 한 자루로 세 건물을 모두 격파했습니다.</p><div class="buttons"><button class="start-button" data-action="start">다시 도전</button><button class="start-button secondary" data-action="title">타이틀</button></div></section>`;
  else if (game.mode === "defeat")
    html = `<section class="menu shade"><span class="stage-stamp">MISSION FAILED</span><h2>${game.stageClock === 0 ? "시간이 다 됐습니다" : "낙하물에 쓰러졌습니다"}</h2>${stats()}<p>공격을 멈추고 ↓를 누르면 날아오는 파편을 막을 수 있습니다.<br>경고와 낙하를 확인한 뒤 다시 도전하세요.</p><div class="buttons"><button class="start-button" data-action="start">처음부터 재도전</button><button class="start-button secondary" data-action="title">타이틀</button></div></section>`;
  menus.innerHTML = html;
  status.textContent = game.paused
    ? "일시정지"
    : {
        intro: `${SITES[game.stage].name} 시작`,
        stageclear: "현장 격파 완료",
        victory: "모든 현장 완료",
        defeat: "작전 실패",
      }[game.mode] || "";
}
on(menus, "click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "start") launch();
  if (action === "help") {
    game.mode = "help";
    refresh();
  }
  if (action === "title") title();
  if (action === "resume") {
    setPause(false);
    canvas.focus();
  }
  if (action === "next") {
    continueSite(game);
    clearInput();
    refresh();
    canvas.focus();
  }
});
on(pauseButton, "click", () => setPause(!game.paused));
on(audioButton, "click", () => {
  muted = !muted;
  audioButton.textContent = muted ? "소리 OFF" : "소리 ON";
  audioButton.setAttribute("aria-pressed", String(!muted));
  if (!muted) sound("parry");
});
motionButton.setAttribute("aria-pressed", String(reduced));
on(motionButton, "click", () => {
  reduced = !reduced;
  painter?.setReduced(reduced);
  motionButton.setAttribute("aria-pressed", String(reduced));
  motionButton.textContent = reduced ? "효과 최소" : "효과 줄이기";
});
const map = {
  ArrowUp: "rise",
  ArrowDown: "guard",
  KeyZ: "slash",
  KeyX: "charge",
  Enter: "confirm",
};
function keyDown(e) {
  if (e.code === "Escape" && !e.repeat) {
    e.preventDefault();
    setPause(!game.paused);
    return;
  }
  if (!["play", "intro"].includes(game.mode) || game.paused) return;
  const action = map[e.code];
  if (action) {
    e.preventDefault();
    if (!e.repeat) keys.down(action);
  }
}
function keyUp(e) {
  const action = map[e.code];
  if (action) {
    keys.up(action);
    if (["play", "intro"].includes(game.mode)) e.preventDefault();
  }
}
on(window, "keydown", keyDown);
on(window, "keyup", keyUp);
on(window, "blur", () => setPause(true));
on(document, "visibilitychange", () => {
  if (document.hidden) setPause(true);
});
for (const button of document.querySelectorAll("[data-control]")) {
  const action = button.dataset.control;
  on(button, "pointerdown", (e) => {
    e.preventDefault();
    if (game.paused || game.mode !== "play") return;
    button.setPointerCapture(e.pointerId);
    keys.down(action);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    on(button, name, () => keys.up(action));
}
function frame(now) {
  const steps = ticker.frame(now, keys.sample());
  if (steps) keys.consume();
  while (game.events.length) sound(game.events.shift().type);
  painter.paint(game);
  refresh();
  raf = requestAnimationFrame(frame);
}
try {
  menus.innerHTML =
    '<section class="menu shade"><h2>현장 준비 중</h2><p>검객과 도시 원화를 불러오고 있습니다.</p></section>';
  const [hero, walls, city] = await Promise.all(
    ["./art/swordsman.png", "./art/facades.png", "./art/cityback.png"].map(load),
  );
  await document.fonts.load("16px BladePixel");
  painter = makePainter(ctx, { hero, walls, city }, createCanvas);
  painter.setReduced(reduced);
  refresh();
  raf = requestAnimationFrame(frame);
} catch (error) {
  menus.innerHTML =
    '<section class="menu shade"><h2>현장을 불러오지 못했습니다</h2><p>새로고침해 주세요. 로컬 서버에서 실행해야 합니다.</p></section>';
  console.error(error);
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf);
    audio?.close();
    keys.clear();
    lifecycle.abort();
  });
