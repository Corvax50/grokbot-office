// Status rules shared by the page and the CI check.
// Asleep is never stored. It is true when updatedAt is 72 hours or older
// than the clock at page load. Reload to recompute it.

export const STORED_STATES = ["working", "free", "blocked", "waiting"];
export const ASLEEP_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export const TASK_MAX = 80;

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseTime(value) {
  if (typeof value !== "string" || !ISO_TIME.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function isAsleep(updatedAtMs, nowMs) {
  if (updatedAtMs == null) return false;
  return nowMs - updatedAtMs >= ASLEEP_AFTER_MS;
}

function problem(list, message) {
  list.push({ message });
}

function cleanText(value, max, label, problems, fallback) {
  if (typeof value !== "string") {
    problem(problems, `${label} is missing.`);
    return fallback;
  }
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) {
    problem(problems, `${label} is empty.`);
    return fallback;
  }
  if (text.length > max) {
    problem(problems, `${label} is longer than ${max} characters.`);
    return text.slice(0, max);
  }
  return text;
}

export function validateStatus(data, knownIds) {
  const problems = [];
  const entries = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    problem(problems, "status.json must be an object with a bots array.");
    return { problems, entries };
  }
  if (!Array.isArray(data.bots)) {
    problem(problems, "status.json is missing a bots array.");
    return { problems, entries };
  }
  const seen = new Set();
  data.bots.forEach((entry, index) => {
    const where = `bots[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      problem(problems, `${where} is not an object.`);
      return;
    }
    const id = entry.id;
    if (typeof id !== "string" || !knownIds.includes(id)) {
      problem(problems, `${where} has an unknown id.`);
      return;
    }
    if (seen.has(id)) {
      problem(problems, `${id} is listed more than once.`);
      return;
    }
    seen.add(id);
    if (!STORED_STATES.includes(entry.state)) {
      problem(problems, `${id} has an unknown state.`);
      return;
    }
    const task = cleanText(entry.task, TASK_MAX, `${id} task`, problems, "No task reported");
    let updatedAt = null;
    let updatedAtMs = null;
    if (entry.updatedAt == null) {
      problem(problems, `${id} is missing updatedAt.`);
    } else {
      updatedAtMs = parseTime(entry.updatedAt);
      if (updatedAtMs == null) {
        problem(problems, `${id} has an unreadable updatedAt.`);
      } else {
        updatedAt = entry.updatedAt;
      }
    }
    let reason = "";
    if (entry.reason != null) {
      reason = cleanText(entry.reason, TASK_MAX, `${id} reason`, problems, "");
    } else if (entry.state === "blocked" || entry.state === "waiting") {
      problem(problems, `${id} is ${entry.state} without a reason.`);
    }
    entries.push({ id, state: entry.state, task, updatedAt, updatedAtMs, reason });
  });
  return { problems, entries };
}

export function validateHandoffs(data, knownIds) {
  const problems = [];
  const handoffs = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    problem(problems, "handoffs.json must be an object with a handoffs array.");
    return { problems, handoffs };
  }
  if (!Array.isArray(data.handoffs)) {
    problem(problems, "handoffs.json is missing a handoffs array.");
    return { problems, handoffs };
  }
  data.handoffs.forEach((entry, index) => {
    const where = `handoffs[${index}]`;
    if (!entry || typeof entry !== "object") {
      problem(problems, `${where} is not an object.`);
      return;
    }
    const from = entry.from;
    const to = entry.to;
    if (!knownIds.includes(from) || !knownIds.includes(to)) {
      problem(problems, `${where} names a bot that is not on this floor.`);
      return;
    }
    if (from === to) {
      problem(problems, `${where} starts and ends at the same desk.`);
      return;
    }
    if (typeof entry.label !== "string" || !entry.label.trim()) {
      problem(problems, `${where} needs a label.`);
      return;
    }
    const label = cleanText(entry.label, 40, `${where} label`, problems, "");
    if (!label) return;
    handoffs.push({ from, to, label });
  });
  if (handoffs.length > 12) {
    problem(problems, "Only the first 12 handoffs are shown.");
    handoffs.length = 12;
  }
  return { problems, handoffs };
}

export function poseFor(state, asleep) {
  if (asleep) return "asleep";
  if (state === "free") return "free";
  if (state === "blocked") return "blocked";
  if (state === "waiting") return "waiting";
  if (state === "working") return "working";
  return "missing";
}

export function placeFor(pose, state) {
  if (pose === "free") return "lounge";
  if (pose === "asleep" && state === "free") return "lounge";
  return "desk";
}

export function buildModel(statusRaw, handoffRaw, knownIds, now) {
  const problems = [];
  const status = statusRaw
    ? validateStatus(statusRaw, knownIds)
    : { problems: [], entries: [] };
  const hands = handoffRaw
    ? validateHandoffs(handoffRaw, knownIds)
    : { problems: [], handoffs: [] };
  problems.push(...status.problems, ...hands.problems);

  const byId = {};
  for (const id of knownIds) {
    const entry = status.entries.find((item) => item.id === id) || null;
    const asleep = entry ? isAsleep(entry.updatedAtMs, now) : false;
    const state = entry ? entry.state : null;
    const pose = poseFor(state, asleep);
    byId[id] = {
      id,
      state,
      task: entry ? entry.task : "",
      updatedAt: entry ? entry.updatedAt : null,
      updatedAtMs: entry ? entry.updatedAtMs : null,
      reason: entry ? entry.reason : "",
      asleep,
      pose,
      place: placeFor(pose, state),
      missing: !entry,
    };
  }

  const handoffs = hands.handoffs.map((hand) => {
    const sender = byId[hand.from];
    const hold = !sender || sender.missing || sender.asleep;
    return { ...hand, animate: !hold, hold: sender && sender.asleep ? "asleep" : sender && sender.missing ? "missing" : null };
  });

  const approvals = knownIds.filter((id) => byId[id].state === "waiting");

  return { now, problems, byId, handoffs, approvals };
}

export function formatWhen(updatedAtMs, now) {
  if (updatedAtMs == null) return "Unknown time";
  const min = Math.round((now - updatedAtMs) / 60000);
  if (Math.abs(min) < 1) return "Just now";
  const sign = min < 0 ? "from now" : "ago";
  const abs = Math.abs(min);
  if (abs < 60) return `${abs} min ${sign}`;
  const hr = Math.round(abs / 60);
  if (hr < 48) return `${hr} hr ${sign}`;
  const day = Math.round(hr / 24);
  return `${day} days ${sign}`;
}

export function stateLabel(bot) {
  if (bot.missing) return "No report";
  if (bot.asleep) return "Asleep";
  if (bot.state === "working") return "Working";
  if (bot.state === "free") return "Free";
  if (bot.state === "blocked") return "Blocked";
  if (bot.state === "waiting") return "Waiting";
  return "No report";
}
