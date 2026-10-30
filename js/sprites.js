// Chunky 16-bit props and people. Coordinates grow down; feet sit at y = 0.
import { createStamp, drawText, fillCircle } from "./pixels.js";

const SKIN = "#f0c0a0";
const SKIN_DIM = "#d8b09a";
const SHOE = "#2a160f";
const WOOD = "#a86840";
const WOOD_DARK = "#6e3e28";
const WOOD_LIGHT = "#d4925c";
const CREAM = "#fff3e0";
const INK = "#2a160f";

function drawHuman(s, bot, pose, frame) {
  const asleep = pose === "asleep";
  const slump = asleep ? 1 : 0;
  const skin = asleep ? SKIN_DIM : SKIN;
  const shirt = pose === "blocked" ? "#c4483a" : bot.shirt;
  const pants = bot.pants;

  s.rect(-4, -4, 3, 4, pants);
  s.rect(1, -4, 3, 4, pants);
  s.rect(-4, -2, 3, 2, SHOE);
  s.rect(1, -2, 3, 2, SHOE);

  if (bot.accessory === "coat") {
    s.rect(-6, -13 + slump, 12, 9, CREAM);
  } else {
    s.rect(-5, -12 + slump, 10, 8, shirt);
  }

  if (pose === "waiting") {
    s.rect(-8, -20 + slump, 3, 9, shirt);
    s.rect(-8, -22 + slump, 3, 2, skin);
    s.rect(5, -11 + slump, 3, 7, shirt);
    s.rect(5, -5 + slump, 3, 2, skin);
  } else if (pose === "working") {
    const reach = frame ? 1 : 0;
    s.rect(-8, -11 + slump, 3, 7, shirt);
    s.rect(-8, -5 + slump, 3, 2, skin);
    s.rect(5, -9 + slump - reach, 3 + reach, 3, shirt);
    s.rect(5 + reach, -7 + slump - reach, 2, 2, skin);
  } else {
    s.rect(-8, -11 + slump, 3, 7, shirt);
    s.rect(5, -11 + slump, 3, 7, shirt);
    s.rect(-8, -5 + slump, 3, 2, skin);
    s.rect(5, -5 + slump, 3, 2, skin);
  }

  const hy = -20 + slump;
  s.rect(-4, hy, 8, 7, skin);
  s.rect(-5, hy - 1, 10, 3, bot.hair);
  s.rect(-5, hy + 1, 1, 3, bot.hair);
  s.rect(4, hy + 1, 1, 3, bot.hair);

  if (asleep) {
    s.rect(-3, hy + 3, 2, 1, INK);
    s.rect(1, hy + 3, 2, 1, INK);
  } else {
    s.rect(-3, hy + 3, 2, 2, INK);
    s.rect(1, hy + 3, 2, 2, INK);
    s.rect(-1, hy + 5, 2, 1, "#c48878");
    if (bot.accessory === "glasses") s.rect(-4, hy + 3, 8, 1, "#1c2830");
    if (bot.accessory === "visor") s.rect(-4, hy + 2, 8, 3, "#b6d25a");
  }

  if (bot.accessory === "headset") {
    s.rect(-5, hy, 10, 1, INK);
    s.rect(4, hy + 1, 2, 3, "#3a3a3a");
    s.p(5, hy + 2, "#f0c14a");
  }
  if (bot.accessory === "beret") {
    s.rect(-6, hy - 3, 10, 3, "#7a4088");
    s.rect(2, hy - 4, 2, 2, "#f0c14a");
  }
  if (bot.id === "dex") {
    s.rect(-2, -11 + slump, 4, 6, "#e0a030");
  }
  if (bot.accessory === "coat") {
    s.rect(-1, -11 + slump, 2, 5, "#3aaa62");
    s.rect(-2, -9 + slump, 4, 2, "#3aaa62");
  }
  if (bot.id === "box") {
    s.rect(-2, -10 + slump, 4, 4, "#f4d2a4");
    s.rect(-2, -10 + slump, 4, 1, WOOD_DARK);
    s.rect(-2, -8 + slump, 4, 1, WOOD_DARK);
  }
}

function drawRobot(s, pose) {
  const asleep = pose === "asleep";
  const slump = asleep ? 1 : 0;
  const body = pose === "blocked" ? "#c4483a" : "#e0a858";
  s.rect(-4, -3, 3, 3, WOOD_DARK);
  s.rect(1, -3, 3, 3, WOOD_DARK);
  s.rect(-5, -12 + slump, 10, 9, body);
  s.rect(-3, -10 + slump, 6, 4, CREAM);
  s.rect(-2, -9 + slump, 4, 1, WOOD_DARK);
  if (pose === "waiting") {
    s.rect(-8, -18, 3, 8, body);
    s.rect(-8, -20, 3, 2, "#f0c878");
    s.rect(5, -10, 3, 6, body);
  } else {
    const reach = pose === "working" ? 1 : 0;
    s.rect(-8, -11 + slump, 3, 6, body);
    s.rect(5, -11 + slump - reach, 3, 6, body);
  }
  s.rect(-4, -19 + slump, 8, 7, "#f0c878");
  if (asleep) {
    s.rect(-3, -16 + slump, 2, 1, INK);
    s.rect(1, -16 + slump, 2, 1, INK);
  } else {
    s.rect(-3, -16 + slump, 2, 2, INK);
    s.rect(1, -16 + slump, 2, 2, INK);
  }
  s.rect(0, -22 + slump, 1, 3, WOOD_DARK);
  s.rect(-1, -23 + slump, 3, 2, "#f0c14a");
}

function folder(s, x, y) {
  s.rect(x, y, 5, 4, "#e6d2a2");
  s.rect(x, y, 3, 1, "#f7e7c4");
}

export function drawActor(pix, bot, x, y, pose, frame, opts = {}) {
  const s = createStamp(2);
  if (bot.kind === "robot") drawRobot(s, pose, frame);
  else drawHuman(s, bot, pose, frame);
  if (opts.carry) folder(s, opts.mirror ? -11 : 6, -14);
  s.paint(pix, x, y + (pose === "asleep" ? 2 : 0), Boolean(opts.mirror));
}

export function drawShadow(pix, x, y) {
  pix.rect(x - 8, y - 2, 16, 3, "#7a4530");
}

export function drawMark(pix, kind, x, y, frame) {
  if (kind === "blocked") {
    const bob = frame ? -1 : 0;
    pix.rect(x + 8, y - 36 + bob, 10, 14, CREAM);
    pix.rect(x + 11, y - 33 + bob, 4, 6, "#b4332c");
    pix.rect(x + 11, y - 25 + bob, 4, 2, "#b4332c");
  }
  if (kind === "asleep") {
    const rise = frame ? 3 : 0;
    drawText(pix, "Z", x + 10, y - 40 - rise, CREAM, 2);
  }
  if (kind === "missing") {
    drawText(pix, "?", x - 4, y - 40, CREAM, 2);
  }
}

function paintLabel(pix, text, x, y) {
  drawText(pix, text, x + 1, y, "#102428", 2);
  drawText(pix, text, x, y + 1, "#102428", 2);
  drawText(pix, text, x, y, "#9eefe4", 2);
}

function paintProp(pix, x, y, draw) {
  const s = createStamp(2);
  draw(s);
  s.paint(pix, x, y, false);
}

export function drawProp(pix, prop, x, y, frame) {
  if (prop.kind === "kanban") {
    paintProp(pix, x, y, (s) => {
      s.rect(-12, -28, 24, 26, WOOD_DARK);
      s.rect(-11, -27, 22, 24, "#f7efe0");
      for (let col = 0; col < 3; col += 1) {
        const cx = -9 + col * 7;
        s.rect(cx, -25, 6, 2, ["#d24a3a", "#e0a030", "#3aaa62"][col]);
        s.rect(cx, -22, 6, 5, CREAM);
        s.rect(cx, -16, 6, 4, "#f3d7b0");
        if (col !== 1) s.rect(cx, -11, 6, 4, "#e7c8a4");
      }
    });
  }
  if (prop.kind === "dex-desk") {
    paintProp(pix, x, y, (s) => {
      s.rect(-14, -12, 28, 6, WOOD_LIGHT);
      s.rect(-14, -7, 28, 6, WOOD);
      s.rect(-12, -2, 3, 3, WOOD_DARK);
      s.rect(9, -2, 3, 3, WOOD_DARK);
      s.rect(-8, -14, 6, 4, CREAM);
      s.rect(-1, -15, 5, 4, "#f7e7c4");
      s.rect(6, -16, 3, 3, "#f0c14a");
      s.rect(7, -18, 1, 2, WOOD_DARK);
    });
  }
  if (prop.kind === "monitors") {
    paintProp(pix, x, y, (s) => {
      s.rect(-16, -20, 14, 12, "#243038");
      s.rect(-15, -19, 12, 8, "#14383c");
      s.rect(-4, -9, 3, 4, "#243038");
      s.rect(-8, -5, 10, 2, WOOD_DARK);
      s.rect(2, -22, 14, 12, "#243038");
      s.rect(3, -21, 12, 8, "#14383c");
      s.rect(6, -10, 3, 5, "#243038");
      s.rect(4, -5, 10, 2, WOOD_DARK);
      s.rect(5, -18, 2, 2, "#3aaa62");
      s.rect(8, -18, 2, 2, "#3aaa62");
      s.rect(11, -18, 2, 2, "#e0a030");
    });
    paintLabel(pix, "PR", x - 28, y - 34);
    paintLabel(pix, "CI", x + 10, y - 36);
  }
  if (prop.kind === "records") {
    paintProp(pix, x, y, (s) => {
      s.rect(-4, -18, 12, 16, "#8a6848");
      s.rect(-3, -17, 10, 4, WOOD_LIGHT);
      s.rect(-3, -12, 10, 4, WOOD);
      s.rect(-3, -7, 10, 4, WOOD_DARK);
      s.rect(6, -16, 2, 2, "#d24a3a");
      s.rect(6, -11, 2, 2, "#e0a030");
      s.rect(6, -6, 2, 2, "#3a6a8a");
      s.rect(-16, -12, 10, 8, "#5f7040");
      s.rect(-15, -10, 8, 3, "#1c2a22");
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) s.rect(-15 + col * 3, -6 + row * 2, 2, 1, "#d7d0c4");
      }
      s.rect(-14, -22, 8, 5, "#e7a090");
      s.rect(-12, -24, 3, 3, "#e7a090");
      s.rect(-9, -20, 3, 2, "#c48878");
      s.rect(-11, -21, 3, 1, INK);
      s.p(-10, -20, INK);
    });
  }
  if (prop.kind === "library") {
    paintProp(pix, x, y, (s) => {
      s.rect(-14, -26, 16, 24, WOOD_DARK);
      s.rect(-13, -25, 14, 22, "#6b3a28");
      const spines = ["#d24a3a", "#e0a030", "#3a6a8a", "#3aaa62", "#f4e2c4", "#7a4088"];
      for (let i = 0; i < spines.length; i += 1) s.rect(-12 + (i % 6) * 2, -23, 2, 8, spines[i]);
      for (let i = 0; i < 5; i += 1) s.rect(-12 + i * 2, -13, 2, 8, spines[(i + 2) % spines.length]);
      s.rect(4, -16, 8, 8, "#6aa8c8");
      s.rect(7, -16, 1, 8, CREAM);
      s.rect(4, -13, 8, 1, CREAM);
      s.rect(7, -8, 1, 3, WOOD_DARK);
      s.rect(5, -5, 6, 2, WOOD_DARK);
      s.rect(8, -14, 6, 6, "#d7e4ea");
      s.rect(13, -10, 1, 6, WOOD);
      s.p(10, -12, "#9ec8d4");
    });
  }
  if (prop.kind === "medic") {
    paintProp(pix, x, y, (s) => {
      s.rect(-8, -12, 16, 8, CREAM);
      s.rect(-8, -5, 16, 4, "#d7ddd8");
      s.rect(-1, -16, 2, 7, "#3aaa62");
      s.rect(-3, -14, 6, 2, "#3aaa62");
      s.rect(-10, -8, 3, 6, "#c8d0c8");
      s.rect(7, -8, 3, 6, "#c8d0c8");
    });
  }
  if (prop.kind === "studio") {
    paintProp(pix, x, y, (s) => {
      s.rect(-2, -22, 2, 18, WOOD);
      s.rect(-8, -6, 14, 2, WOOD_DARK);
      s.rect(0, -20, 10, 12, CREAM);
      s.rect(1, -19, 8, 3, "#f2a56a");
      s.rect(1, -16, 8, 3, "#d15a3c");
      s.rect(1, -13, 8, 4, "#4a2044");
      s.rect(-12, -12, 7, 9, "#f7e7c4");
      s.rect(-11, -11, 5, 3, "#7a4088");
      s.rect(-11, -8, 5, 3, "#2f8f8a");
      s.rect(-8, -16, 5, 6, CREAM);
      s.rect(-7, -15, 3, 4, "#e0a030");
    });
  }
  if (prop.kind === "workshop") {
    const hook = frame ? 2 : 0;
    paintProp(pix, x, y, (s) => {
      s.rect(-12, -8, 20, 5, WOOD);
      s.rect(-12, -4, 20, 3, WOOD_DARK);
      s.rect(-14, -24, 2, 20, "#8a949c");
      s.rect(8, -24, 2, 16, "#8a949c");
      s.rect(-14, -24, 24, 2, "#d0d4dc");
      s.rect(-2 + hook, -22, 1, 8, INK);
      s.rect(-3 + hook, -14, 3, 2, "#f0c14a");
      s.rect(-6, -10, 4, 3, "#8a949c");
    });
  }
  if (prop.kind === "couch") {
    paintProp(pix, x, y, (s) => {
      s.rect(-14, -10, 28, 6, "#a8443c");
      s.rect(-14, -6, 28, 5, "#c45a4a");
      s.rect(-12, -8, 10, 3, "#e07a68");
      s.rect(2, -8, 10, 3, "#e07a68");
      s.rect(-14, -12, 3, 8, WOOD_DARK);
      s.rect(11, -12, 3, 8, WOOD_DARK);
    });
  }
  if (prop.kind === "table") {
    paintProp(pix, x, y, (s) => {
      s.rect(-6, -6, 12, 4, WOOD_LIGHT);
      s.rect(-6, -3, 12, 3, WOOD);
      s.rect(-2, -9, 4, 3, CREAM);
      s.rect(-1, -8, 2, 1, "#6b3a28");
    });
  }
  if (prop.kind === "plant") {
    paintProp(pix, x, y, (s) => {
      s.rect(-3, -4, 6, 4, "#c46b3a");
      s.rect(-6, -10, 5, 5, "#3e6228");
      s.rect(-2, -12, 5, 5, "#5e8a3a");
      s.rect(1, -9, 4, 4, "#6e9a48");
    });
  }
  if (prop.kind === "lamp") {
    paintProp(pix, x, y, (s) => {
      s.rect(-1, -14, 2, 12, WOOD_DARK);
      s.rect(-4, -18, 8, 4, "#f0c14a");
      s.rect(-3, -2, 6, 2, WOOD);
    });
    fillCircle(pix, x, y - 30, 8, "#ffd9a0");
  }
  if (prop.kind === "mat") {
    paintProp(pix, x, y, (s) => {
      s.rect(-8, -4, 16, 5, "#8c3d3a");
      s.rect(-6, -3, 12, 2, "#c46b4a");
    });
  }
}
