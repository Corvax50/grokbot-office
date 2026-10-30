// Boots City Hall. Swap the room import when another building joins the city.
import { BOTS } from "./bots.js";
import { loadOfficeData } from "./data.js";
import { mountOffice } from "./office.js";
import { cityHall } from "./room.js";
import { mountUi } from "./ui.js";

const banner = document.querySelector("#banner");
const ui = mountUi({
  banner,
  approvals: document.querySelector("#approvals"),
  detail: document.querySelector("#detail"),
  roster: document.querySelector("#roster"),
  handoffs: document.querySelector("#handoffs"),
  onSelect: (id) => select(id),
});

const office = mountOffice({
  canvas: document.querySelector("#floor"),
  platesEl: document.querySelector("#plates"),
  carryEl: document.querySelector("#carry"),
  room: cityHall,
  bots: BOTS,
  onSelect: (id) => select(id),
});

function select(id) {
  office.select(id);
  ui.select(id);
}

try {
  const model = await loadOfficeData();
  ui.setModel(model);
  office.setModel(model);
} catch (error) {
  banner.hidden = false;
  banner.replaceChildren();
  const p = document.createElement("p");
  p.textContent = "The floor could not be read. Reload the page once the JSON files are in place.";
  banner.append(p);
  console.error(error);
}
