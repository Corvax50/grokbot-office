// Folds data/outbox/<id>.json into data/handoffs.json.
// Each bot owns one file, so two writers never edit the same path.
// `from` is the file name. Run this, then commit the merged handoffs.json.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function mergeHandoffFiles(files) {
  const handoffs = [];
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of sorted) {
    const id = file.name.replace(/\.json$/i, "");
    const data = file.data;
    if (!data || typeof data !== "object" || !Array.isArray(data.handoffs)) {
      throw new Error(`${file.name} must be an object with a handoffs array.`);
    }
    for (const item of data.handoffs) {
      if (!item || typeof item !== "object") throw new Error(`${file.name} has a handoff that is not an object.`);
      if (item.from != null && item.from !== id) {
        throw new Error(`${file.name} contains a handoff from ${item.from}.`);
      }
      handoffs.push({
        from: id,
        to: item.to,
        label: item.label,
        createdAt: item.createdAt,
      });
    }
  }
  return { handoffs };
}

async function main() {
  const dir = path.join(root, "data", "outbox");
  let names = [];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No data/outbox directory. handoffs.json was left as it is.");
      return;
    }
    throw error;
  }
  if (names.length === 0) {
    console.log("No per-bot handoff files. handoffs.json was left as it is.");
    return;
  }
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      data: JSON.parse(await readFile(path.join(dir, name), "utf8")),
    })),
  );
  const merged = mergeHandoffFiles(files);
  await writeFile(path.join(root, "data", "handoffs.json"), JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${merged.handoffs.length} handoffs to data/handoffs.json`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
