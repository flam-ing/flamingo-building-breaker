import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { swordsmanFrames } from "../src/sprites.mjs";

test("eight connected alpha poses crop cleanly with valid feet pivots", async () => {
  const hero = await loadImage("public/art/swordsman.png"),
    frames = swordsmanFrames(hero, createCanvas);
  assert.equal(frames.length, 8);
  for (const frame of frames) {
    assert.ok(frame.width > 300);
    assert.ok(frame.height > 200);
    assert.ok(frame.pivot > 0 && frame.pivot < frame.width);
    const c = createCanvas(frame.width, frame.height),
      ctx = c.getContext("2d");
    ctx.drawImage(frame.image, 0, 0);
    const data = ctx.getImageData(0, 0, frame.width, frame.height).data;
    let transparent = 0,
      opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 24) transparent++;
      else opaque++;
    }
    assert.ok(transparent > opaque, "no opaque backdrop behind the figure");
  }
});
