// Grid walks for handoffs. Four directions, so a bot stays on the diamond axes.

export function canWalk(room, c, r) {
  if (c < 1 || r < 1 || c > room.cols - 2 || r > room.rows - 2) return false;
  return !room.blocked.includes(c + "," + r);
}

function key(tile) {
  return tile.c + "," + tile.r;
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function findPath(room, start, goal) {
  if (!start || !goal) return null;
  if (!canWalk(room, start.c, start.r) || !canWalk(room, goal.c, goal.r)) return null;
  if (key(start) === key(goal)) return [{ c: start.c, r: start.r }];
  const queue = [{ c: start.c, r: start.r }];
  const prev = new Map([[key(start), null]]);
  while (queue.length) {
    const cur = queue.shift();
    for (const [dc, dr] of STEPS) {
      const next = { c: cur.c + dc, r: cur.r + dr };
      const id = key(next);
      if (prev.has(id) || !canWalk(room, next.c, next.r)) continue;
      prev.set(id, cur);
      if (id === key(goal)) {
        const path = [next];
        let walk = cur;
        while (walk) {
          path.push({ c: walk.c, r: walk.r });
          walk = prev.get(key(walk));
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

export function nearestApproach(room, from, stand, avoid) {
  const avoidKey = avoid ? key(avoid) : null;
  const around = STEPS.map(([dc, dr]) => ({ c: stand.c + dc, r: stand.r + dr }));
  const options = avoidKey === key(stand) ? around : [stand, ...around];
  let best = null;
  let bestLen = Infinity;
  for (const goal of options) {
    const path = findPath(room, from, goal);
    if (path && path.length < bestLen) {
      best = path;
      bestLen = path.length;
    }
  }
  return best;
}

export function assignTiles(room, botIds, byId) {
  const tiles = {};
  let lounge = 0;
  for (const id of botIds) {
    const bot = byId[id];
    if (bot && bot.place === "lounge") {
      tiles[id] = room.lounge[lounge % room.lounge.length];
      lounge += 1;
    } else {
      tiles[id] = room.stands[id];
    }
  }
  return tiles;
}
