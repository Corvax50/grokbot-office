// City Hall, building 01.
// A later building exports the same fields: cols, rows, tile size, origin,
// stands, lounge slots, blocked tiles, props, and wall decals.
// office.js draws whatever room it is given.

export const cityHall = {
  id: "city-hall",
  name: "City Hall",
  cols: 14,
  rows: 12,
  tileW: 48,
  tileH: 24,
  originX: 360,
  originY: 96,
  wallH: 56,
  viewW: 780,
  viewH: 470,
  scale: 2,
  stands: {
    dex: { c: 7, r: 5 },
    box: { c: 6, r: 2 },
    code: { c: 11, r: 3 },
    greed: { c: 11, r: 6 },
    atlas: { c: 2, r: 3 },
    medic: { c: 2, r: 7 },
    pixel: { c: 3, r: 9 },
    "bot-jesus": { c: 11, r: 9 },
  },
  lounge: [
    { c: 6, r: 9 },
    { c: 8, r: 9 },
    { c: 7, r: 10 },
    { c: 5, r: 10 },
  ],
  blocked: [
    "7,4",
    "6,1",
    "12,2",
    "12,5",
    "1,2",
    "1,6",
    "1,9",
    "12,8",
    "7,8",
    "8,10",
    "5,8",
    "9,10",
  ],
  rugs: ["6,9", "7,9", "8,9", "9,9", "10,9", "6,10", "7,10", "8,10", "9,10", "10,10"],
  props: [
    { kind: "kanban", c: 6, r: 1 },
    { kind: "dex-desk", c: 7, r: 4 },
    { kind: "monitors", c: 12, r: 2 },
    { kind: "records", c: 12, r: 5 },
    { kind: "library", c: 1, r: 2 },
    { kind: "medic", c: 1, r: 6 },
    { kind: "studio", c: 1, r: 9 },
    { kind: "workshop", c: 12, r: 8 },
    { kind: "couch", c: 7, r: 8 },
    { kind: "table", c: 8, r: 10 },
    { kind: "plant", c: 5, r: 8 },
    { kind: "lamp", c: 9, r: 10 },
    { kind: "mat", c: 8, r: 11 },
  ],
  decals: [
    { wall: "west", r: 6, kind: "cross" },
    { wall: "north", c: 4, kind: "window" },
    { wall: "north", c: 9, kind: "window" },
    { wall: "west", r: 3, kind: "window" },
    { wall: "west", r: 9, kind: "window" },
  ],
};

export function tileTop(room, c, r) {
  const hw = room.tileW / 2;
  const hh = room.tileH / 2;
  return {
    x: (c - r) * hw + room.originX,
    y: (c + r) * hh + room.originY,
  };
}

export function tileCenter(room, c, r) {
  const top = tileTop(room, c, r);
  return { x: top.x, y: top.y + room.tileH / 2, c, r };
}

export function diamondPoints(room, c, r) {
  const top = tileTop(room, c, r);
  const hw = room.tileW / 2;
  const hh = room.tileH / 2;
  return [
    { x: top.x, y: top.y },
    { x: top.x + hw, y: top.y + hh },
    { x: top.x, y: top.y + hh * 2 },
    { x: top.x - hw, y: top.y + hh },
  ];
}
