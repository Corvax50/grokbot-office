// Tiny pixel buffer. All scene art goes through here so it stays crisp.

const OUTLINE = "#2a160f";

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function createPixels(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const cache = new Map();

  function rgb(hex) {
    let found = cache.get(hex);
    if (!found) {
      const n = parseInt(hex.slice(1), 16);
      found = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      cache.set(hex, found);
    }
    return found;
  }

  function p(x, y, hex) {
    x |= 0;
    y |= 0;
    if ((x | y) < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    const c = rgb(hex);
    data[o] = c[0];
    data[o + 1] = c[1];
    data[o + 2] = c[2];
    data[o + 3] = 255;
  }

  function rect(x, y, rw, rh, hex) {
    for (let j = 0; j < rh; j += 1) {
      for (let i = 0; i < rw; i += 1) p(x + i, y + j, hex);
    }
  }

  function copyFrom(other) {
    data.set(other.data);
  }

  let sheet = null;
  function blit(ctx, scale) {
    if (!sheet) {
      sheet = document.createElement("canvas");
      sheet.width = w;
      sheet.height = h;
    }
    sheet.getContext("2d").putImageData(new ImageData(data, w, h), 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, 0, 0, w * scale, h * scale);
  }

  return { w, h, data, p, rect, copyFrom, blit };
}

export function fillPoly(pix, points, paint) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  minY = Math.floor(minY);
  maxY = Math.ceil(maxY);
  for (let y = minY; y <= maxY; y += 1) {
    const xs = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const crosses = (a.y <= y && b.y > y) || (b.y <= y && a.y > y);
      if (!crosses) continue;
      const t = (y - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.ceil(xs[i]);
      const x1 = Math.floor(xs[i + 1]);
      for (let x = x0; x <= x1; x += 1) pix.p(x, y, paint(x, y));
    }
  }
}

export function line(pix, x0, y0, x1, y1, color) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const dx = Math.abs(Math.round(x1) - x);
  const dy = Math.abs(Math.round(y1) - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    pix.p(x, y, color);
    if (x === Math.round(x1) && y === Math.round(y1)) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

export function fillCircle(pix, cx, cy, rad, color) {
  const r2 = rad * rad;
  for (let y = -rad; y <= rad; y += 1) {
    const span = Math.floor(Math.sqrt(r2 - y * y));
    pix.rect(cx - span, cy + y, span * 2 + 1, 1, color);
  }
}

// 3x5 glyphs. Advance is scale * 4.
const FONT = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  C: ["###", "#..", "#..", "#..", "###"],
  E: ["###", "#..", "##.", "#..", "###"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  L: ["#..", "#..", "#..", "#..", "###"],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  " ": ["...", "...", "...", "...", "..."],
};

export function textWidth(text, scale = 1) {
  return text.length * 4 * scale;
}

export function drawText(pix, text, x, y, color, scale = 1) {
  let cursor = x;
  for (const ch of text) {
    const glyph = FONT[ch] || FONT[" "];
    glyph.forEach((row, j) => {
      for (let i = 0; i < row.length; i += 1) {
        if (row[i] === "#") {
          pix.rect(cursor + i * scale, y + j * scale, scale, scale, color);
        }
      }
    });
    cursor += 4 * scale;
  }
}

// Stamp collects chunky pixels, then paints them with a 1px outline.
export function createStamp(dot = 2) {
  const pts = [];

  function p(x, y, color) {
    pts.push(x, y, color);
  }

  function rect(x, y, w, h, color) {
    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) p(x + i, y + j, color);
    }
  }

  function paint(dest, ox, oy, mirror = false) {
    const filled = new Set();
    const pixels = [];
    for (let i = 0; i < pts.length; i += 3) {
      let x = pts[i];
      const y = pts[i + 1];
      const color = pts[i + 2];
      if (mirror) x = -x - 1;
      for (let dy = 0; dy < dot; dy += 1) {
        for (let dx = 0; dx < dot; dx += 1) {
          const px = ox + x * dot + dx;
          const py = oy + y * dot + dy;
          filled.add(px + "," + py);
          pixels.push(px, py, color);
        }
      }
    }
    for (let i = 0; i < pixels.length; i += 3) {
      const x = pixels[i];
      const y = pixels[i + 1];
      for (const [dx, dy] of NEIGHBORS) {
        if (!filled.has(x + dx + "," + (y + dy))) dest.p(x + dx, y + dy, OUTLINE);
      }
    }
    for (let i = 0; i < pixels.length; i += 3) dest.p(pixels[i], pixels[i + 1], pixels[i + 2]);
  }

  return { p, rect, paint };
}
