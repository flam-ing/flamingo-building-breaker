import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { makeGame, start, tick } from "../src/game.mjs";
import { makePainter } from "../src/paint.mjs";
GlobalFonts.registerFromPath("public/fonts/Galmuri11.ttf", "BladePixel");
const [hero, walls, city] = await Promise.all(
  ["swordsman", "facades", "cityback"].map((name) =>
    loadImage(`public/art/${name}.png`),
  ),
);
const canvas = createCanvas(1280, 720),
  painter = makePainter(
    canvas.getContext("2d"),
    { hero, walls, city },
    createCanvas,
  );
await mkdir("docs/previews", { recursive: true });
for (let pose = 0; pose < 8; pose++)
  console.log("pose", pose, painter.frames[pose].source);
const g = start(makeGame());
tick(g, { confirm: true });
for (let i = 0; i < 8; i++) tick(g, { slash: i === 0 });
painter.paint(g);
await writeFile("docs/previews/slash.png", canvas.toBuffer("image/png"));
for (let i = 0; i < 25; i++) tick(g, {});
tick(g, { guardPressed: true, guardHeld: true });
painter.paint(g);
await writeFile("docs/previews/guard.png", canvas.toBuffer("image/png"));
const atlas = createCanvas(1280, 500),
  ac = atlas.getContext("2d");
ac.fillStyle = "#28424b";
ac.fillRect(0, 0, 1280, 500);
for (let i = 0; i < 8; i++) {
  const f = painter.frames[i],
    x = (i % 4) * 320 + 155,
    y = Math.floor(i / 4) * 250 + 210;
  ac.drawImage(
    f.image,
    x - f.pivot * 0.5,
    y - f.height * 0.5,
    f.width * 0.5,
    f.height * 0.5,
  );
  ac.strokeStyle = "#f9da88";
  ac.beginPath();
  ac.moveTo(x - 140, y);
  ac.lineTo(x + 140, y);
  ac.stroke();
  ac.fillStyle = "#fff";
  ac.fillText(String(i), x, y + 25);
}
await writeFile("docs/previews/pose-atlas.png", atlas.toBuffer("image/png"));
console.log("CPU canvas captures saved; these are not browser QA.");
