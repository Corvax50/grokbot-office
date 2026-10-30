// One read at load. There is no timer and no second fetch.
import { BOT_IDS } from "./bots.js";
import { buildModel } from "./model.js";

async function readJson(url, problems, fetchImpl) {
  try {
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) {
      problems.push({ message: `${url} could not be loaded (${response.status}).` });
      return null;
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      problems.push({ message: `${url} is not valid JSON.` });
      return null;
    }
  } catch {
    problems.push({ message: `${url} could not be loaded.` });
    return null;
  }
}

export async function loadOfficeData(fetchImpl = fetch, now = Date.now()) {
  const loadProblems = [];
  const [statusRaw, handoffRaw] = await Promise.all([
    readJson("data/status.json", loadProblems, fetchImpl),
    readJson("data/handoffs.json", loadProblems, fetchImpl),
  ]);
  const model = buildModel(statusRaw, handoffRaw, BOT_IDS, now);
  model.problems = [...loadProblems, ...model.problems];
  return model;
}
