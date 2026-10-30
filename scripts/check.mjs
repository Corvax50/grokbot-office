// CI entry: schema, runtime rules, paths across the floor, and a light HTML check.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOT_IDS } from "../js/bots.js";
import { loadOfficeData } from "../js/data.js";
import { buildModel, isAsleep, isRecentHandoff, publicTextIssues, STORED_STATES } from "../js/model.js";
import { cityHall } from "../js/room.js";
import { assignTiles, nearestApproach } from "../js/walk.js";
import { mergeHandoffFiles } from "./merge-handoffs.mjs";
import { mergeBotRecords } from "./merge-status.mjs";
import { validateSchema } from "./schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

function fail(message) {
  problems.push(message);
}

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(root, rel), "utf8"));
}

const status = readJson("data/status.json");
const handoffs = readJson("data/handoffs.json");
const statusSchema = readJson("data/status.schema.json");
const handoffSchema = readJson("data/handoffs.schema.json");

for (const message of validateSchema(status, statusSchema)) fail(`status.json ${message}`);
for (const message of validateSchema(handoffs, handoffSchema)) fail(`handoffs.json ${message}`);

const schemaStates = statusSchema.$defs.bot.properties.state.enum;
if (schemaStates.join(",") !== STORED_STATES.join(",")) {
  fail("status schema states drifted from js/model.js");
}

const now = Date.parse("2026-10-30T20:44:00Z");
const model = buildModel(status, handoffs, BOT_IDS, now);
for (const item of model.problems) fail(`example data: ${item.message}`);
for (const id of BOT_IDS) {
  if (model.byId[id].missing) fail(`example status is missing ${id}`);
}
if (!model.byId["bot-jesus"].asleep) fail("bot-jesus should be asleep on 2026-10-30");
if (model.byId.dex.asleep) fail("dex should still be awake in the example");
if (!model.approvals.includes("code")) fail("code should be in approvals");
if (model.byId.pixel.place !== "lounge") fail("pixel should be in the lounge");
if (model.byId.greed.pose !== "blocked") fail("greed should be blocked");
if (model.handoffs.length !== 2) fail("sample handoffs should still be inside 24 hours");

if (isAsleep(Date.parse("2026-10-27T00:00:00Z"), Date.parse("2026-10-30T00:00:00Z")) !== true) {
  fail("exactly 72 hours should count as asleep");
}
if (isAsleep(Date.parse("2026-10-27T00:00:01Z"), Date.parse("2026-10-30T00:00:00Z")) !== false) {
  fail("just under 72 hours should stay awake");
}

const day = Date.parse("2026-10-30T20:44:00Z");
if (isRecentHandoff(day - 24 * 60 * 60 * 1000, day) !== true) fail("a handoff exactly 24 hours old should show");
if (isRecentHandoff(day - 24 * 60 * 60 * 1000 - 1, day) !== false) fail("a handoff older than 24 hours should hide");
if (isRecentHandoff(day + 1000, day) !== false) fail("a future handoff should hide");

const aged = buildModel(
  { bots: [] },
  {
    handoffs: [
      { from: "pixel", to: "code", label: "Icon sheet", createdAt: "2026-10-29T20:44:00Z" },
      { from: "atlas", to: "dex", label: "Shelf list", createdAt: "2026-10-29T20:43:59Z" },
    ],
  },
  BOT_IDS,
  day,
);
if (aged.handoffs.map((hand) => hand.from).join(",") !== "pixel") {
  fail("only the handoff inside 24 hours should remain");
}

const staleWait = buildModel(
  {
    bots: [
      {
        id: "code",
        state: "waiting",
        task: "Ready to send the patch",
        updatedAt: "2026-10-26T11:00:00Z",
        reason: "Needs a yes before the next step",
      },
    ],
  },
  { handoffs: [] },
  BOT_IDS,
  day,
);
if (!staleWait.approvals.includes("code") || !staleWait.byId.code.asleep) {
  fail("a waiting bot stays on Approvals after 3 days and is marked asleep");
}

if (publicTextIssues("Sorting today's assignments").length !== 0) fail("a generic task should pass");
if (!publicTextIssues("File the $12 note").includes("currency")) fail("a currency amount should be flagged");
if (!publicTextIssues("Paid 12 USD").includes("currency")) fail("a currency code should be flagged");
if (!publicTextIssues("Write ada@example.com").includes("email")) fail("an email should be flagged");
if (!publicTextIssues(`${"a".repeat(81)}`).includes("long text")) fail("long free text should be flagged");
if (!publicTextIssues("line one\nline two", 40).includes("long text")) fail("a line break should be flagged");

const leaked = buildModel(
  {
    bots: [
      {
        id: "greed",
        state: "working",
        task: "File the $12 note",
        updatedAt: "2026-10-30T18:00:00Z",
      },
    ],
  },
  { handoffs: [] },
  BOT_IDS,
  day,
);
if (leaked.byId.greed.task !== "Not shown") fail("currency should not be shown on the floor");
if (!leaked.problems.some((item) => item.message.includes("currency"))) fail("currency should be reported");

function scanPublic(value, where, max) {
  for (const issue of publicTextIssues(value, max)) fail(`${where} looks unsafe to publish (${issue})`);
}
for (const bot of status.bots) {
  scanPublic(bot.task, `${bot.id} task`, 80);
  if (bot.reason) scanPublic(bot.reason, `${bot.id} reason`, 80);
}
for (const hand of handoffs.handoffs) scanPublic(hand.label, `${hand.from} handoff`, 40);

const badStatus = buildModel(
  { bots: [{ id: "nope", state: "flying" }, { id: "dex", state: "flying" }] },
  { handoffs: [{ from: "dex", to: "dex", label: "Loop" }] },
  BOT_IDS,
  now,
);
if (badStatus.problems.length < 3) fail("invalid entries should be reported, not thrown");
const badJsonShape = buildModel(null, null, BOT_IDS, now);
if (badJsonShape.byId.dex.missing !== true) fail("missing files should leave bots unreported");

const tiles = assignTiles(cityHall, BOT_IDS, model.byId);
for (const hand of model.handoffs) {
  if (!hand.animate) continue;
  const stand = cityHall.stands[hand.to];
  const avoid = model.byId[hand.to].place === "desk" ? stand : null;
  const route = nearestApproach(cityHall, tiles[hand.from], stand, avoid);
  if (!route || route.length < 2) fail(`no walk from ${hand.from} to ${hand.to}`);
}

const merged = mergeBotRecords([
  { id: "box", state: "free", task: "Idle", updatedAt: "2026-10-30T12:00:00Z" },
  { id: "dex", state: "working", task: "Routing", updatedAt: "2026-10-30T12:00:00Z" },
]);
if (merged.bots.map((bot) => bot.id).join(",") !== "box,dex") fail("merge should sort by id");

const mergedHands = mergeHandoffFiles([
  {
    name: "pixel.json",
    data: { handoffs: [{ to: "code", label: "Icon sheet", createdAt: "2026-10-30T19:10:00Z" }] },
  },
  {
    name: "atlas.json",
    data: { handoffs: [{ to: "dex", label: "Shelf list", createdAt: "2026-10-30T18:50:00Z" }] },
  },
]);
if (mergedHands.handoffs.map((hand) => hand.from).join(",") !== "atlas,pixel") {
  fail("handoff merge should name from the file and sort by bot");
}

const html = readFileSync(path.join(root, "index.html"), "utf8");
for (const needle of [
  "<!DOCTYPE html>",
  '<html lang="en">',
  "City Hall",
  'id="floor"',
  'id="roster"',
  'id="approvals"',
  'id="handoffs"',
  'id="banner"',
  'type="module"',
  "js/main.js",
  "<noscript>",
]) {
  if (!html.includes(needle)) fail(`index.html is missing ${needle}`);
}

const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
for (const ref of refs) {
  if (ref.startsWith("data:") || ref.startsWith("#")) continue;
  if (/^(https?:)?\/\//.test(ref)) fail(`index.html links off-site: ${ref}`);
  else if (!readFileSync(path.join(root, ref))) fail(`missing asset ${ref}`);
}

const voidTags = new Set(["meta", "link", "img", "br", "input", "source", "area", "base", "col", "embed", "hr", "wbr"]);
const stack = [];
const tags = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*)>/g;
for (const match of html.matchAll(tags)) {
  if (match[0].startsWith("<!--")) continue;
  if (match[1]) {
    const tag = match[1].toLowerCase();
    const top = stack.pop();
    if (top !== tag) fail(`index.html has </${tag}> after <${top || "nothing"}>`);
  } else {
    const tag = match[2].toLowerCase();
    const self = voidTags.has(tag) || /\/\s*$/.test(match[3]);
    if (!self) stack.push(tag);
  }
}
if (stack.length) fail(`index.html left tags open: ${stack.join(", ")}`);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const dupes = ids.filter((id, index) => ids.indexOf(id) !== index);
if (dupes.length) fail(`duplicate ids: ${dupes.join(", ")}`);

if (/(?:src|href)\s*=\s*["']\//.test(html)) fail("index.html uses a root-absolute path");
for (const file of readdirSync(path.join(root, "js"))) {
  if (!file.endsWith(".js")) continue;
  const text = readFileSync(path.join(root, "js", file), "utf8");
  if (text.includes("http://") || text.includes("https://")) fail(`${file} should not fetch a remote URL`);
  if (/fetch\(\s*["']\//.test(text) || /from\s+["']\//.test(text)) {
    fail(`${file} uses a root-absolute path`);
  }
}

const pages = readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8");
if (!pages.includes("actions/deploy-pages@")) fail("pages workflow should use actions/deploy-pages");
if (!/branches:\s*\[main\]/.test(pages)) fail("pages workflow should run only on main");
if (pages.includes("pull_request")) fail("pages workflow should not run on pull requests");

const missed = await loadOfficeData(async () => {
  throw new Error("offline");
});
if (!missed.problems.some((item) => item.message.includes("could not be loaded"))) {
  fail("a failed fetch should be reported");
}
if (!missed.byId.dex.missing) fail("a failed fetch should leave the roster without invented reports");

const broken = await loadOfficeData(async (url) => ({
  ok: true,
  status: 200,
  text: async () => (url.includes("status") ? "{not json" : '{"handoffs":[]}'),
}));
if (!broken.problems.some((item) => item.message.includes("not valid JSON"))) {
  fail("invalid JSON should be reported");
}
if (!broken.byId.code.missing) fail("invalid status should not invent a report");

if (problems.length) {
  for (const message of problems) console.error(message);
  process.exit(1);
}
console.log("check ok");
