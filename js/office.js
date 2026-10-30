// Renders one room. City Hall is the first building; the draw loop only
// knows the room object, the bot catalog, and the model from status.json.
import { createPixels, drawText, fillCircle, fillPoly, line, textWidth } from "./pixels.js";
import { diamondPoints, tileCenter, tileTop } from "./room.js";
import { drawActor, drawMark, drawProp, drawShadow } from "./sprites.js";
import { assignTiles, findPath, nearestApproach } from "./walk.js";
import { botById } from "./bots.js";

const TILE_MS = 340;
const GIVE_MS = 900;

const FLOOR_A = "#c48458";
const FLOOR_B = "#b5734a";
const FLOOR_LINE = "#8a4e32";
const RUG_A = "#8c3d4a";
const RUG_B = "#a35258";
const STEP = "#d2a078";
const WALL = "#f0c4a4";
const WALL_SHADE = "#e0a888";
const WALL_WEST = "#e7b898";

function sky(pix) {
  const bands = [
    [0, 36, "#4a2044"],
    [36, 70, "#7a3058"],
    [70, 110, "#c4543c"],
    [110, 168, "#e8834a"],
    [168, 230, "#f2a56a"],
    [230, pix.h, "#c4845a"],
  ];
  for (const [y0, y1, color] of bands) pix.rect(0, y0, pix.w, y1 - y0, color);
  fillCircle(pix, 90, 58, 22, "#ffd7a8");
  fillCircle(pix, 90, 58, 12, "#fff0d2");
  const ground = 210;
  for (const [x, h] of [
    [16, 36],
    [30, 52],
    [46, 28],
    [pix.w - 48, 44],
    [pix.w - 32, 28],
    [pix.w - 16, 50],
  ]) {
    pix.rect(x, ground - h, 12, h, "#3a1830");
    for (let wy = ground - h + 6; wy < ground - 4; wy += 8) pix.p(x + 4, wy, "#ffcf88");
  }
}

function drawTower(pix, room) {
  const top = tileTop(room, 0, 0);
  const x = top.x;
  const y = top.y - room.wallH;
  pix.rect(x - 12, y - 22, 24, 24, "#e7b48a");
  pix.rect(x - 16, y - 26, 32, 6, "#6b3a28");
  pix.rect(x - 7, y - 16, 14, 12, "#f2a56a");
  pix.rect(x - 1, y - 16, 2, 12, "#6b3a28");
  pix.rect(x - 7, y - 11, 14, 2, "#6b3a28");
  pix.rect(x - 2, y - 32, 4, 6, "#f0c14a");
}

function wallPaint(base) {
  return (x, y) => (y % 7 === 0 ? "#f6dcc4" : base);
}

function drawWalls(pix, room) {
  const hw = room.tileW / 2;
  const hh = room.tileH / 2;
  const lift = room.wallH;
  for (let r = 0; r < room.rows; r += 1) {
    const top = tileTop(room, 0, r);
    fillPoly(
      pix,
      [
        { x: top.x - hw, y: top.y + hh },
        { x: top.x, y: top.y },
        { x: top.x, y: top.y - lift },
        { x: top.x - hw, y: top.y + hh - lift },
      ],
      wallPaint(WALL_WEST),
    );
  }
  for (let c = 0; c < room.cols; c += 1) {
    const top = tileTop(room, c, 0);
    fillPoly(
      pix,
      [
        { x: top.x, y: top.y },
        { x: top.x + hw, y: top.y + hh },
        { x: top.x + hw, y: top.y + hh - lift },
        { x: top.x, y: top.y - lift },
      ],
      wallPaint(c === 0 ? WALL_SHADE : WALL),
    );
  }
  for (const decal of room.decals) {
    if (decal.kind === "window") drawWindow(pix, room, decal);
    if (decal.kind === "cross") drawCross(pix, room, decal);
  }
  const sign = "CITY HALL";
  const width = textWidth(sign, 2);
  const x = room.originX + 70;
  const y = 28;
  pix.rect(x - 6, y - 4, width + 12, 18, "#6b3a28");
  pix.rect(x - 4, y - 2, width + 8, 14, "#f3d7b0");
  drawText(pix, sign, x, y, "#2a160f", 2);
}

function drawWindow(pix, room, decal) {
  const top = decal.wall === "west" ? tileTop(room, 0, decal.r) : tileTop(room, decal.c, 0);
  const x = decal.wall === "west" ? top.x - 16 : top.x + 10;
  const y = top.y - room.wallH + 16;
  pix.rect(x, y, 14, 12, "#6b3a28");
  pix.rect(x + 2, y + 2, 10, 8, "#ffd2a0");
  pix.rect(x + 6, y + 2, 2, 8, "#6b3a28");
  pix.rect(x + 2, y + 5, 10, 2, "#6b3a28");
}

function drawCross(pix, room, decal) {
  const top = tileTop(room, 0, decal.r);
  const x = top.x - 18;
  const y = top.y - room.wallH + 18;
  pix.rect(x + 3, y, 4, 14, "#3aaa62");
  pix.rect(x, y + 4, 10, 4, "#3aaa62");
}

function drawFloor(pix, room) {
  const rug = new Set(room.rugs);
  for (let r = 0; r < room.rows; r += 1) {
    for (let c = 0; c < room.cols; c += 1) {
      const id = c + "," + r;
      const edge = c === 0 || r === 0 || c === room.cols - 1 || r === room.rows - 1;
      const points = diamondPoints(room, c, r);
      let base = (c + r) % 2 === 0 ? FLOOR_A : FLOOR_B;
      if (rug.has(id)) base = (c + r) % 2 === 0 ? RUG_A : RUG_B;
      else if (edge) base = STEP;
      fillPoly(pix, points, (x, y) => ((x + y) % 9 === 0 ? FLOOR_LINE : base));
      const [a, b, d, e] = points;
      line(pix, a.x, a.y, b.x, b.y, FLOOR_LINE);
      line(pix, b.x, b.y, d.x, d.y, FLOOR_LINE);
      line(pix, d.x, d.y, e.x, e.y, FLOOR_LINE);
      line(pix, e.x, e.y, a.x, a.y, FLOOR_LINE);
    }
  }
}

function drawStatic(pix, room) {
  sky(pix);
  drawTower(pix, room);
  drawWalls(pix, room);
  drawFloor(pix, room);
}

function buildCues(room, model, tiles) {
  const cues = [];
  for (const hand of model.handoffs) {
    if (!hand.animate) continue;
    const start = tiles[hand.from];
    const stand = room.stands[hand.to];
    const recipient = model.byId[hand.to];
    const avoid = recipient && recipient.place === "desk" ? stand : null;
    const path = nearestApproach(room, start, stand, avoid);
    if (!path || path.length < 2) continue;
    const back = findPath(room, path[path.length - 1], start);
    cues.push({
      kind: "walk",
      id: hand.from,
      path,
      ms: (path.length - 1) * TILE_MS,
      carry: true,
      label: hand.label,
    });
    cues.push({
      kind: "give",
      id: hand.from,
      tile: path[path.length - 1],
      ms: GIVE_MS,
      carry: true,
      label: hand.label,
    });
    if (back && back.length > 1) {
      cues.push({
        kind: "walk",
        id: hand.from,
        path: back,
        ms: (back.length - 1) * TILE_MS,
        carry: false,
        label: hand.label,
      });
    }
  }
  return cues;
}

function cueAt(cues, elapsed) {
  let t = elapsed;
  for (let i = 0; i < cues.length; i += 1) {
    if (t < cues[i].ms) return { cue: cues[i], local: t, index: i };
    t -= cues[i].ms;
  }
  return null;
}

function pointOnPath(room, path, local, ms) {
  if (!path?.length) return null;
  if (path.length === 1 || !(ms > 0)) {
    const only = tileCenter(room, path[0].c, path[0].r);
    return { ...only, mirror: false };
  }
  const spans = path.length - 1;
  const dist = Math.min(spans, Math.max(0, (local / ms) * spans));
  const index = Math.min(spans - 1, Math.floor(dist));
  const frac = dist - index;
  const next = Math.min(spans, index + 1);
  const a = tileCenter(room, path[index].c, path[index].r);
  const b = tileCenter(room, path[next].c, path[next].r);
  const tile = frac < 0.5 ? path[index] : path[next];
  return {
    x: Math.round(a.x + (b.x - a.x) * frac),
    y: Math.round(a.y + (b.y - a.y) * frac + (Math.floor(local / 160) % 2 === 0 ? 0 : -1)),
    c: tile.c,
    r: tile.r,
    mirror: b.x < a.x,
  };
}

function percent(v, total) {
  return (v / total) * 100 + "%";
}

export function mountOffice({ canvas, platesEl, carryEl, room, bots, onSelect }) {
  const scale = room.scale;
  canvas.width = room.viewW * scale;
  canvas.height = room.viewH * scale;
  canvas.parentElement.style.aspectRatio = `${room.viewW} / ${room.viewH}`;
  const ctx = canvas.getContext("2d");
  const base = createPixels(room.viewW, room.viewH);
  drawStatic(base, room);

  let model = null;
  let tiles = {};
  let cues = [];
  let selected = null;
  let running = true;
  let cueStart = 0;
  const boot = performance.now();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const buttons = new Map();

  function ensureButtons() {
    for (const bot of bots) {
      if (buttons.has(bot.id)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nameplate";
      button.textContent = bot.name;
      button.addEventListener("click", () => onSelect(bot.id));
      platesEl.append(button);
      buttons.set(bot.id, button);
    }
  }

  function placeChip(el, x, y) {
    el.hidden = false;
    el.style.left = percent(x, room.viewW);
    el.style.top = percent(y, room.viewH);
  }

  function frame(now) {
    if (!running) return;
    try {
    const idle = now - boot;
    const elapsed = !model || reduce ? 0 : now - cueStart;
    const pix = createPixels(room.viewW, room.viewH);
    pix.copyFrom(base);
    const active = model && !reduce ? cueAt(cues, elapsed) : null;
    const moving = active && active.cue.kind === "walk"
      ? pointOnPath(room, active.cue.path, active.local, active.cue.ms)
      : null;
    const giving = active && active.cue.kind === "give" ? active.cue : null;

    if (model && selected && tiles[selected] && active?.cue.id !== selected) {
      const points = diamondPoints(room, tiles[selected].c, tiles[selected].r);
      const [a, b, d, e] = points;
      line(pix, a.x, a.y, b.x, b.y, "#f0c14a");
      line(pix, b.x, b.y, d.x, d.y, "#f0c14a");
      line(pix, d.x, d.y, e.x, e.y, "#f0c14a");
      line(pix, e.x, e.y, a.x, a.y, "#f0c14a");
    }

    const drawables = [];
    for (const prop of room.props) {
      const at = tileCenter(room, prop.c, prop.r);
      drawables.push({
        key: prop.c + prop.r,
        layer: 1,
        draw: (target) => drawProp(target, prop, at.x + (prop.dx || 0), at.y + (prop.dy || 0), Math.floor(idle / 420) % 2),
      });
    }

    if (model) {
      for (const bot of bots) {
        const report = model.byId[bot.id];
        const home = tiles[bot.id];
        if (!home) continue;
        let at = tileCenter(room, home.c, home.r);
        let mirror = false;
        let carry = false;
        if (active && active.cue.id === bot.id) {
          if (moving) {
            at = moving;
            mirror = moving.mirror;
            carry = active.cue.carry;
          } else if (giving) {
            at = tileCenter(room, giving.tile.c, giving.tile.r);
            carry = true;
          }
        }
        const pose = report ? report.pose : "missing";
        const spriteFrame = Math.floor(idle / 280) % 2;
        drawables.push({
          key: at.c + at.r,
          layer: 2,
          draw: (target) => {
            drawShadow(target, at.x, at.y);
            drawActor(target, bot, at.x, at.y, pose, spriteFrame, { mirror, carry });
            if (pose === "blocked" || pose === "asleep" || pose === "missing") {
              drawMark(target, pose, at.x, at.y, spriteFrame);
            }
          },
          plate: { id: bot.id, x: at.x, y: at.y - 40, pose },
        });
      }
    }

    drawables.sort((a, b) => a.key - b.key || a.layer - b.layer);
    for (const item of drawables) item.draw(pix);
    pix.blit(ctx, scale);

    if (model) {
      ensureButtons();
      for (const item of drawables) {
        if (!item.plate) continue;
        const button = buttons.get(item.plate.id);
        button.style.left = percent(item.plate.x, room.viewW);
        button.style.top = percent(item.plate.y, room.viewH);
        button.dataset.pose = item.plate.pose;
        button.setAttribute("aria-pressed", String(selected === item.plate.id));
        const report = model.byId[item.plate.id];
        const name = botById(item.plate.id).name;
        button.setAttribute("aria-label", report.missing ? `${name}, no report` : `${name}, ${report.pose}`);
      }
      const carried = moving || (giving ? tileCenter(room, giving.tile.c, giving.tile.r) : null);
      if (active && active.cue.carry && carried) {
        carryEl.textContent = active.cue.label;
        placeChip(carryEl, carried.x, carried.y - 52);
      } else {
        carryEl.hidden = true;
      }
    }

    } catch (error) {
      console.error(error);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  canvas.addEventListener("click", (event) => {
    if (!model) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * room.viewW;
    const y = ((event.clientY - rect.top) / rect.height) * room.viewH;
    let best = null;
    let bestDist = 42;
    for (const bot of bots) {
      const button = buttons.get(bot.id);
      if (!button) continue;
      const bx = (parseFloat(button.style.left) / 100) * room.viewW;
      const by = (parseFloat(button.style.top) / 100) * room.viewH + 20;
      const dist = Math.hypot(bx - x, by - y);
      if (dist < bestDist) {
        best = bot.id;
        bestDist = dist;
      }
    }
    if (best) onSelect(best);
  });

  return {
    setModel(next) {
      model = next;
      tiles = assignTiles(room, bots.map((bot) => bot.id), model.byId);
      cues = buildCues(room, model, tiles);
      cueStart = performance.now();
    },
    select(id) {
      selected = id;
    },
    destroy() {
      running = false;
    },
  };
}
