import {
  W,
  H,
  SITES,
  HERO_X,
  HERO_GROUND,
  TOWER_BOTTOM,
  FLOOR_HEIGHT,
} from "./game.mjs";
import { swordsmanFrames } from "./sprites.mjs";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function makePainter(ctx, assets, createCanvas) {
  const frames = swordsmanFrames(assets.hero, createCanvas);
  let reduce = false;
  const box = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const path = (points, fill, stroke = "#253b43", weight = 2) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = weight;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  };
  const line = (points, color = "#e3e7da", width = 3) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const oval = (x, y, rx, ry, fill, stroke = null, width = 2) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  };
  const type = (
    s,
    x,
    y,
    size = 20,
    color = "#fff1bf",
    align = "left",
    stroke = false,
  ) => {
    ctx.font = `${size}px BladePixel, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    if (stroke) {
      ctx.strokeStyle = "#23353e";
      ctx.lineWidth = 6;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  };
  function hero(pose, x, y, scale = 1, flip = false, opacity = 1) {
    const f = frames[pose],
      ratio = 0.43 * scale;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.globalAlpha = opacity;
    ctx.drawImage(
      f.image,
      -f.pivot * ratio,
      -f.height * ratio,
      f.width * ratio,
      f.height * ratio,
    );
    ctx.restore();
  }
  function background(g) {
    ctx.drawImage(assets.city, 0, 0, W, H);
    if (g.stage === 1) box(0, 0, W, 620, "#54737119");
    if (g.stage === 2) box(0, 0, W, 620, "#b1722822");
  }
  function floorStrip(material, x, y, w, h) {
    const image = assets.walls,
      sourceH = image.height / 3;
    ctx.drawImage(
      image,
      0,
      material * sourceH,
      image.width,
      sourceH,
      x,
      y,
      w,
      h,
    );
    box(x, y, w, 3, "#1b2c36");
    box(x, y + h - 6, w, 6, "#293a3d");
    line(
      [
        [x, y],
        [x, y + h],
      ],
      "#e6d3a8",
      2,
    );
    line(
      [
        [x + w, y],
        [x + w, y + h],
      ],
      "#e6d3a8",
      2,
    );
  }
  function cracks(g, x, y, w, h) {
    const lost = 1 - g.floorHp / g.floorMax;
    for (const hit of g.floorHits) {
      const cx = x + w * hit.x,
        cy = y + h * hit.y;
      for (let j = 0; j < 3; j++) {
        const a = hit.seed * 6.2 + j * 2.05,
          extent = 25 + lost * 52;
        const px = cx + Math.cos(a) * extent,
          py = cy + Math.sin(a) * extent * 0.55;
        line(
          [
            [cx, cy],
            [
              cx + Math.cos(a + 0.3) * extent * 0.42,
              cy + Math.sin(a + 0.3) * extent * 0.23,
            ],
            [px, py],
          ],
          "#1c2c31",
          3,
        );
        line(
          [
            [cx + 2, cy + 1],
            [px + 2, py + 1],
          ],
          "#e0d8bc99",
          1,
        );
      }
    }
    if (lost > 0.4) {
      for (let i = 0; i < 3; i++) {
        const dx = x + 140 + i * 145;
        path(
          [
            [dx, y + 28],
            [dx + 29, y + 39],
            [dx + 8, y + 67],
            [dx - 19, y + 60],
          ],
          "#233a40",
          "#81b2b599",
          2,
        );
      }
    }
    if (lost > 0.72) {
      path(
        [
          [x + w * 0.34, y + h],
          [x + w * 0.39, y + h - 22],
          [x + w * 0.44, y + h - 9],
          [x + w * 0.5, y + h - 28],
          [x + w * 0.57, y + h - 5],
          [x + w * 0.63, y + h],
        ],
        "#253a3c",
        null,
      );
    }
  }
  function tower(g) {
    const site = SITES[g.stage],
      remaining = Math.max(0, site.floors - g.floor),
      fall = g.collapse > 0 ? -FLOOR_HEIGHT * (g.collapse / 0.48) ** 2 : 0;
    const wiggle =
      !reduce && g.hazard ? Math.sin(g.clock * 54) * g.hazard.time * 2 : 0;
    const x = 330 + wiggle,
      w = 620,
      bottom = TOWER_BOTTOM + fall;
    ctx.save();
    ctx.beginPath();
    ctx.rect(326, -1000, 630, 1420);
    ctx.clip();
    for (let i = 0; i < Math.min(remaining, 5); i++) {
      const y = bottom - FLOOR_HEIGHT * (i + 1);
      floorStrip(g.stage, x, y, w, FLOOR_HEIGHT);
      if (i === 0) {
        cracks(g, x, y, w, FLOOR_HEIGHT);
        if ((g.floor + 1) % 3 === 0) {
          line(
            [
              [x + 15, y + 13],
              [x + 105, y + 103],
            ],
            "#f0c060",
            9,
          );
          line(
            [
              [x + w - 15, y + 13],
              [x + w - 105, y + 103],
            ],
            "#f0c060",
            9,
          );
        }
      }
    }
    if (remaining > 0 && remaining <= 3) {
      const roofY = bottom - FLOOR_HEIGHT * remaining;
      box(x - 13, roofY - 20, w + 26, 22, "#f0d9ae");
      box(x - 5, roofY - 15, w + 10, 7, "#6d7269");
      for (let i = 0; i < 6; i++)
        box(
          x + 20 + i * 106,
          roofY - 30,
          65,
          10,
          g.stage === 1 ? "#607c76" : "#ad9173",
        );
    }
    ctx.restore();
    if (remaining > 0) {
      const health = g.floorHp / g.floorMax;
      box(493, bottom + 14, 294, 9, "#253d41");
      box(
        495,
        bottom + 16,
        290 * health,
        5,
        g.stage === 1 ? "#e7bd58" : "#f09465",
      );
      type(
        `${g.floor + 1} / ${site.floors}층 · ${(g.floor + 1) % 3 === 0 ? "철골 보강층" : "균열층"}`,
        640,
        bottom + 43,
        14,
        "#fff0bf",
        "center",
        true,
      );
    }
  }
  function hazard(g) {
    if (g.hazard) {
      const p = clamp(g.hazard.time / g.hazard.warning, 0, 1);
      const x = HERO_X,
        y = TOWER_BOTTOM - 60;
      path(
        [
          [x, y - 32],
          [x + 29, y + 19],
          [x - 29, y + 19],
        ],
        "#e56c43",
        "#ffe0a0",
        3,
      );
      type("!", x, y + 11, 31, "#fff5c9", "center");
      type(
        g.hazard.kind === "girder"
          ? "철골 낙하"
          : g.hazard.kind === "glass"
            ? "유리 3연타"
            : "낙석 주의",
        x,
        y - 49,
        17,
        "#fff3c8",
        "center",
        true,
      );
      ctx.beginPath();
      ctx.arc(x, HERO_GROUND + 1, 60, -Math.PI, -Math.PI + p * Math.PI);
      ctx.strokeStyle = "#efb555";
      ctx.lineWidth = 4;
      ctx.stroke();
      line(
        [
          [x - 28, TOWER_BOTTOM + 15],
          [x - 28, 462],
        ],
        "#db7c4770",
        2,
      );
      line(
        [
          [x + 28, TOWER_BOTTOM + 15],
          [x + 28, 462],
        ],
        "#db7c4770",
        2,
      );
    }
    for (const p of g.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin * 0.22);
      if (p.kind === "girder") {
        path(
          [
            [-65, -14],
            [65, -14],
            [65, -4],
            [18, -4],
            [18, 7],
            [65, 7],
            [65, 18],
            [-65, 18],
            [-65, 7],
            [-18, 7],
            [-18, -4],
            [-65, -4],
          ],
          "#647e78",
          "#263e40",
          4,
        );
        for (let x = -52; x < 60; x += 27) oval(x, -8, 3, 3, "#d8c88b");
      } else if (p.kind === "glass") {
        path(
          [
            [0, -24],
            [21, 7],
            [-12, 25],
            [-17, -6],
          ],
          "#b8ece8",
          "#478797",
          3,
        );
        line(
          [
            [-3, -14],
            [10, 9],
          ],
          "#f3ffff",
          3,
        );
      } else {
        path(
          [
            [-25, -13],
            [1, -26],
            [28, -4],
            [22, 19],
            [-14, 25],
            [-31, 4],
          ],
          "#baaa82",
          "#484d43",
          3,
        );
        line(
          [
            [-20, -11],
            [1, 0],
            [19, -1],
          ],
          "#e7d6b1",
          3,
        );
      }
      ctx.restore();
    }
  }
  function drawHero(g) {
    const h = g.hero;
    let pose =
      h.state === "guard"
        ? 3
        : h.state === "hurt"
          ? 4
          : h.state === "charge"
            ? 5
            : h.state === "victory"
              ? 7
              : 0;
    if (h.action) {
      pose =
        h.action.time < h.action.strikeAt
          ? 5
          : h.action.time < h.action.activeUntil
            ? h.action.pose
            : 0;
    }
    const lift = h.lift || 0;
    oval(HERO_X, HERO_GROUND + 2, 65 - lift * 0.12, 10, "#24374150");
    hero(
      pose,
      HERO_X,
      HERO_GROUND - lift,
      1,
      false,
      h.invincible > 0 && !reduce && Math.floor(g.clock * 16) % 2 ? 0.67 : 1,
    );
    if (h.state === "guard") {
      ctx.beginPath();
      ctx.ellipse(HERO_X + 5, 474, 80, 27, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = g.clock - h.guardAt < 0.19 ? "#faffc6" : "#80cbd7";
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    if (h.state === "charge") {
      const fill = clamp(h.charge / 1.25, 0, 1);
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 + (reduce ? 0 : g.clock * 1.7);
        line(
          [
            [HERO_X + Math.cos(a) * 72, 532 + Math.sin(a) * 39],
            [HERO_X + Math.cos(a) * 92, 532 + Math.sin(a) * 53],
          ],
          "#ffd371",
          3,
        );
      }
      box(HERO_X - 60, 607, 120, 6, "#213841");
      box(HERO_X - 59, 608, 118 * fill, 4, "#ffc45d");
      type(
        h.charge > 0.55 ? "떼면 해방" : "X 누르는 중",
        HERO_X,
        440,
        14,
        "#ffebb1",
        "center",
        true,
      );
    }
    const a = h.action;
    if (a && a.time >= a.strikeAt && a.time < a.activeUntil) {
      if (a.type === "special") {
        const q = (a.time - a.strikeAt) / (a.activeUntil - a.strikeAt);
        const angle = reduce ? -0.4 : -1.5 + q * 2.2;
        ctx.save();
        ctx.translate(HERO_X, TOWER_BOTTOM);
        ctx.rotate(angle);
        path(
          [
            [-230, -10],
            [0, -37],
            [245, -10],
            [0, 30],
          ],
          "#fff3b8",
          "#eea34f",
          5,
        );
        ctx.restore();
        line(
          [
            [HERO_X, 455],
            [HERO_X, 82],
          ],
          "#f8eabe",
          24,
        );
        line(
          [
            [HERO_X, 455],
            [HERO_X, 82],
          ],
          "#fffdf2",
          8,
        );
      } else {
        ctx.beginPath();
        ctx.ellipse(
          HERO_X + 22,
          TOWER_BOTTOM + (a.type === "rise" ? 21 : 72),
          a.type === "rise" ? 95 : 156,
          a.type === "rise" ? 139 : 113,
          a.type === "rise" ? -0.8 : -0.35,
          -2.9,
          0.65,
        );
        ctx.strokeStyle = "#ffd88b";
        ctx.lineWidth = a.type === "rise" ? 8 : 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(
          HERO_X + 19,
          TOWER_BOTTOM + (a.type === "rise" ? 20 : 70),
          a.type === "rise" ? 90 : 150,
          a.type === "rise" ? 132 : 108,
          a.type === "rise" ? -0.8 : -0.35,
          -2.9,
          0.4,
        );
        ctx.strokeStyle = "#fcf8dd";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
  function pieces(g) {
    for (const d of g.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.globalAlpha = clamp(d.life, 0, 1);
      const sourceH = assets.walls.height / 3,
        sw = assets.walls.width / 6,
        sh = sourceH / 3;
      ctx.drawImage(
        assets.walls,
        d.col * sw,
        d.material * sourceH + d.row * sh,
        sw,
        sh,
        -d.w / 2,
        -d.h / 2,
        d.w,
        d.h,
      );
      ctx.restore();
    }
    for (const d of g.dust) {
      ctx.globalAlpha = Math.min(1, d.life * 2);
      const color =
        {
          sand: "#ccb98c",
          metal: "#b9dce0",
          glass: "#b4e0e2",
          special: "#ffe0a5",
          hurt: "#de7c63",
        }[d.color] || "#cfba93";
      path(
        [
          [d.x - d.size, d.y],
          [d.x, d.y - d.size * 0.5],
          [d.x + d.size, d.y + 2],
          [d.x + 2, d.y + d.size],
        ],
        color,
        null,
      );
    }
    ctx.globalAlpha = 1;
  }
  function heart(x, y, full) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.bezierCurveTo(-35, -7, -21, -30, -3, -14);
    ctx.bezierCurveTo(15, -35, 41, -10, 0, 13);
    ctx.closePath();
    ctx.fillStyle = full ? "#ef5556" : "#38515c";
    ctx.fill();
    ctx.strokeStyle = "#fff5d6";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  function gauge(x, label, amount, color, hotkey) {
    type(label, x, 655, 17, "#243c46");
    type(hotkey, x + 288, 653, 12, "#755230", "right");
    box(x - 5, 666, 302, 31, "#233b44");
    box(x - 2, 669, 296, 25, "#e9cb84");
    box(x + 2, 673, 288, 17, "#3f4640");
    box(x + 2, 673, 288 * clamp(amount / 100, 0, 1), 17, color);
    line(
      [
        [x - 2, 669],
        [x + 294, 669],
      ],
      "#fff5ca",
      2,
    );
  }
  function hud(g) {
    box(20, 23, 211, 63, "#1f3848e3");
    type("목숨", 33, 62, 18, "#e8e1c7");
    for (let i = 0; i < 3; i++) heart(109 + i * 39, 58, i < g.hearts);
    type(SITES[g.stage].english, 640, 40, 18, "#f8eec9", "center", true);
    type(
      String(Math.ceil(g.stageClock)).padStart(3, "0"),
      640,
      74,
      27,
      "#ffdd88",
      "center",
      true,
    );
    box(986, 68, 270, 45, "#223b48e8");
    type("SCORE", 1000, 93, 13, "#aed0d4");
    type(String(g.score).padStart(7, "0"), 1242, 102, 24, "#ffe9b8", "right");
    type(`SITE ${g.stage + 1} / 3`, 35, 119, 13, "#fff4c9", "left", true);
    box(0, 620, W, 100, "#dda139");
    box(0, 620, W, 7, "#6c5635");
    box(0, 628, W, 3, "#f9d276");
    gauge(46, "방어", g.guard, "#f4da58", "↓");
    gauge(934, "필살", g.energy, "#cc515d", "X");
    type(
      `남은 층  ${Math.max(0, SITES[g.stage].floors - g.floor)}`,
      640,
      658,
      18,
      "#233d46",
      "center",
    );
    type("↑ 상승베기    Z 연속베기", 640, 687, 14, "#384346", "center");
    for (const x of [15, 365, 916, 1265]) {
      oval(x, 640, 5, 5, "#b57c30", "#f5d58e", 1);
      oval(x, 705, 5, 5, "#b57c30", "#f5d58e", 1);
    }
    if (g.combo > 1) {
      type(String(g.combo), 1058, 195, 45, "#fff0b1", "center", true);
      type("연속 베기", 1058, 223, 14, "#fdc77b", "center", true);
    }
    if (g.messageTime > 0) {
      box(351, 126, 578, 32, "#183a49e0");
      type(g.message, 640, 148, 14, "#ffedbd", "center");
    }
  }
  function title(g) {
    background(g);
    box(0, 0, W, H, "#123345aa");
    floorStrip(0, 68, 72, 453, 120);
    floorStrip(0, 68, 194, 453, 120);
    floorStrip(0, 68, 316, 453, 120);
    hero(2, 325, 673, 2.2);
    line(
      [
        [58, 455],
        [520, 455],
      ],
      "#e6b767",
      5,
    );
    type("SWORD VS. SKYLINE", 69, 49, 14, "#edc070");
  }
  function intro(g) {
    box(0, 226, W, 201, "#18374ded");
    type(`SITE 0${g.stage + 1}`, 640, 269, 21, "#efbc63", "center");
    type(SITES[g.stage].name, 640, 332, 46, "#ffedbd", "center");
    type(SITES[g.stage].subtitle, 640, 383, 18, "#d4e5df", "center");
  }
  function paint(g) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (["title", "help"].includes(g.mode)) {
      title(g);
      ctx.restore();
      return;
    }
    if (!reduce && g.shake)
      ctx.translate(
        Math.sin(g.clock * 173) * g.shake * 0.35,
        Math.cos(g.clock * 149) * g.shake * 0.15,
      );
    background(g);
    tower(g);
    hazard(g);
    drawHero(g);
    pieces(g);
    if (g.hero.action?.type === "special" && g.hero.action.time < 0.3) {
      box(0, 198, W, 150, "#1b3540d9");
      type("갈대의 칼날이, 도시를 가른다.", 640, 258, 24, "#ffd989", "center");
      type("일 도 양 단", 640, 310, 38, "#fff4d5", "center");
    }
    hud(g);
    if (g.mode === "intro") intro(g);
    ctx.restore();
  }
  return {
    paint,
    frames,
    setReduced(v) {
      reduce = v;
    },
  };
}
