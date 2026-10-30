// Folds data/bots/<id>.json into data/status.json.
// Each bot file is one status object. Writes do not collide because each bot
// owns a different file. Run this, then commit the merged status.json.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function mergeBotRecords(records) {
  const bots = records
    .map((record) => {
      const data = typeof record === "string" ? JSON.parse(record) : record;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("A bot file must be one JSON object.");
      }
      return data;
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const ids = new Set();
  for (const bot of bots) {
    if (ids.has(bot.id)) throw new Error(`Duplicate bot id ${bot.id}`);
    ids.add(bot.id);
  }
  return { bots };
}

async function main() {
  const dir = path.join(root, "data", "bots");
  let names = [];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No data/bots directory. status.json was left as it is.");
      return;
    }
    throw error;
  }
  if (names.length === 0) {
    console.log("No per-bot files. status.json was left as it is.");
    return;
  }
  const records = await Promise.all(
    names.map((name) => readFile(path.join(dir, name), "utf8")),
  );
  const merged = mergeBotRecords(records);
  const dest = path.join(root, "data", "status.json");
  await writeFile(dest, JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${merged.bots.length} bots to data/status.json`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
