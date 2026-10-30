// Who works in City Hall. A later building imports the same shape.

export const BOTS = [
  {
    id: "dex",
    name: "Dex",
    role: "Central coordinator",
    kind: "human",
    hair: "#3a2418",
    shirt: "#f4e2c4",
    pants: "#5c3a2c",
    accessory: "headset",
  },
  {
    id: "box",
    name: "Box",
    role: "Kanban",
    kind: "human",
    hair: "#6b3a28",
    shirt: "#e07a3a",
    pants: "#4a2c22",
    accessory: "none",
  },
  {
    id: "code",
    name: "Code",
    role: "Checks and reviews",
    kind: "human",
    hair: "#241810",
    shirt: "#2f8f8a",
    pants: "#243038",
    accessory: "glasses",
  },
  {
    id: "greed",
    name: "Greed",
    role: "Records",
    kind: "human",
    hair: "#4a3a20",
    shirt: "#6f8a3a",
    pants: "#3e4a28",
    accessory: "visor",
  },
  {
    id: "atlas",
    name: "Atlas",
    role: "Library",
    kind: "human",
    hair: "#d9d0c4",
    shirt: "#7a5340",
    pants: "#3a2a24",
    accessory: "none",
  },
  {
    id: "pixel",
    name: "Pixel",
    role: "Studio",
    kind: "human",
    hair: "#5a2848",
    shirt: "#e09a72",
    pants: "#4a3058",
    accessory: "beret",
  },
  {
    id: "medic",
    name: "Medic",
    role: "Aid corner",
    kind: "human",
    hair: "#3a2418",
    shirt: "#fff8f0",
    pants: "#c8d0d4",
    accessory: "coat",
  },
  {
    id: "bot-jesus",
    name: "Bot Jesus",
    role: "Workshop",
    kind: "robot",
    hair: "#e0a858",
    shirt: "#e0a858",
    pants: "#6b3a28",
    accessory: "none",
  },
];

export const BOT_IDS = BOTS.map((bot) => bot.id);

export function botById(id) {
  return BOTS.find((bot) => bot.id === id) || null;
}
