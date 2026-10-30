# City Hall — Office v1

![City Hall floor at sunset](docs/screenshot.png)

One room of a future city: an isometric pixel-art floor for Corvax's assistants. The page is static HTML, CSS, and JavaScript. It reads two JSON files when it loads, then stops. Reload to pick up a new commit.

City Hall is building 01. The room is a data object (`js/room.js`); the drawing loop does not care which building it was given.

## Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080. Any static file server works. Opening `index.html` as a `file://` URL will not, because the browser blocks the JSON fetch.

```bash
node scripts/check.mjs
```

checks the example JSON, the walkable paths, and that `index.html` is well formed. No install.

## The floor

| Bot | Station |
| --- | --- |
| Dex | Central coordinator desk |
| Box | Kanban on the wall behind Dex |
| Code | Two monitors, labeled PR and CI |
| Greed | Calculator, piggy bank, and file cabinet. No figures on them |
| Atlas | Library corner: shelves, globe, magnifier |
| Pixel | Easel and canvases |
| Medic | Aid corner with a green cross |
| Bot Jesus | Workshop with a small crane |
| — | Lounge rug, couch, and lamp for anyone who is free |

Names sit on the floor as buttons. The roster under the picture is the same data in text, so the page is usable without the canvas.

## States

A bot stores one of four states:

| State | On the floor |
| --- | --- |
| `working` | At their desk |
| `free` | In the lounge |
| `blocked` | At their desk, in red, with the reason |
| `waiting` | At their desk, hand raised, and listed under Approvals |

`asleep` is not stored. If `updatedAt` is 72 hours or more before the clock at page load, the bot is drawn asleep (a free bot sleeps in the lounge, anyone else at their desk). A waiting bot who has gone quiet stays on the Approvals list and is marked asleep. The threshold is computed once per load.

A handoff is a walk from one desk to another, carrying a file, played once when the page loads. The walker then goes back. `prefers-reduced-motion` skips the walk; the handoff list still shows it. A sender with no report, or one who is asleep, stays put.

If a file is missing, is not JSON, or has a bad entry, the floor still draws. The bad rows are named in the banner and skipped. Everyone without a usable entry shows as "No report".

## JSON

`data/status.json`

```json
{
  "bots": [
    {
      "id": "dex",
      "state": "working",
      "task": "Sorting today's assignments",
      "updatedAt": "2026-10-30T18:05:00Z",
      "reason": "Only for blocked or waiting"
    }
  ]
}
```

- `id`: `dex`, `box`, `code`, `greed`, `atlas`, `pixel`, `medic`, `bot-jesus`
- `state`: `working`, `free`, `blocked`, or `waiting`
- `task`: 1–80 characters
- `updatedAt`: ISO-8601 date-time with `Z` or a numeric offset
- `reason`: optional, same length limit. The example includes one for `blocked` and `waiting`

`data/handoffs.json`

```json
{
  "handoffs": [
    { "from": "pixel", "to": "code", "label": "Icon sheet" }
  ]
}
```

`from` and `to` are ids, and they must differ. `label` is 1–40 characters. The schemas in `data/*.schema.json` match these rules.

The sample timestamps are the evening of 30 October 2026, except Bot Jesus, whose entry is four days older so the floor shows one asleep bot. Open the page much later and the sample will all be asleep. That is the rule, not a stale cache. There is no polling.

## How a bot updates its status

The page only reads. Something else has to commit the JSON.

**One shared `status.json`.** A bot GETs the file through the GitHub Contents API, edits its own object, and PUTs it back with the sha it just read. The page stays a single fetch. Two bots writing at once fight over that sha: the second PUT fails, and a sloppy retry can drop the first bot's edit. Every update is also a commit.

**One file per bot.** Each bot writes only `data/bots/<id>.json` (a single status object). Those writes do not collide. `node scripts/merge-status.mjs` sorts whatever is in that directory into `data/status.json`. The page still reads the merged file, so the merge has to be committed too, by the bot's job or by CI. More files, safer writes. v1 ships the merged example and leaves `data/bots/` empty until you want this.

Handoffs are one list. Dex is the natural single writer, which avoids the same race. A handoff stays in the file until something removes it, so it plays again on every reload.

Tasks in the sample are generic on purpose. Don't put amounts, health details, or personal data in `task` or `reason`.

## Hosting

Nothing is deployed from this repo.

GitHub Pages is free for a public repository. Pages for a private repository needs GitHub Pro, Team, or Enterprise. Turn Pages on after Corvax is willing to make the repo public, or if the plan already includes private Pages.

Netlify and Cloudflare Pages each have a free tier that can publish a static site from a private GitHub repository. This project has no build step: publish the repository root and leave the build command empty. Either is a better fit than Pages while the repo stays private.

## Code

| Path | Role |
| --- | --- |
| `index.html`, `css/` | Page shell and sunset frame |
| `js/room.js` | City Hall: tiles, desks, lounge |
| `js/bots.js` | Names and how each assistant is drawn |
| `js/office.js` | Isometric floor, walks, nameplates |
| `js/model.js` | Validation, asleep, labels |
| `js/data.js` | The one fetch |
| `js/ui.js` | Approvals, detail, roster |
| `scripts/check.mjs` | CI check |
| `scripts/merge-status.mjs` | Optional per-bot merge |
