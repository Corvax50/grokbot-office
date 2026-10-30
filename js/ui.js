// Text roster, approvals, and the detail card. This is the accessible floor.
import { BOTS, botById } from "./bots.js";
import { formatWhen, stateLabel } from "./model.js";

function clear(node) {
  node.replaceChildren();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function mountUi({ banner, approvals, detail, roster, handoffs, onSelect }) {
  let model = null;
  let selected = null;

  function renderBanner() {
    clear(banner);
    if (!model || model.problems.length === 0) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    banner.append(el("p", "banner-title", "Some of the office data could not be used."));
    const list = document.createElement("ul");
    for (const item of model.problems) list.append(el("li", null, item.message));
    banner.append(list);
  }

  function renderApprovals() {
    clear(approvals);
    if (!model || model.approvals.length === 0) {
      approvals.append(el("li", "empty", "Nobody is waiting."));
      return;
    }
    for (const id of model.approvals) {
      const bot = model.byId[id];
      const info = botById(id);
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "approval";
      button.addEventListener("click", () => onSelect(id));
      button.append(el("span", "approval-name", info.name));
      button.append(el("span", "approval-task", bot.task || "No task reported"));
      if (bot.reason) button.append(el("span", "approval-reason", bot.reason));
      if (bot.asleep) button.append(el("span", "approval-note", "Also asleep — last update is 3 or more days old."));
      li.append(button);
      approvals.append(li);
    }
  }

  function renderHandoffs() {
    clear(handoffs);
    if (!model || model.handoffs.length === 0) {
      handoffs.append(el("li", "empty", "No handoffs in the file."));
      return;
    }
    for (const hand of model.handoffs) {
      const from = botById(hand.from);
      const to = botById(hand.to);
      let text = `${from.name} carries “${hand.label}” to ${to.name}'s desk.`;
      if (hand.hold === "asleep") {
        text += " They stay put because that update is 3 or more days old.";
      } else if (hand.hold === "missing") {
        text += " They stay put because they have no status entry.";
      }
      handoffs.append(el("li", null, text));
    }
  }

  function renderDetail() {
    clear(detail);
    if (!selected || !model) {
      detail.append(el("p", "empty", "Select a nameplate or a roster row."));
      return;
    }
    const info = botById(selected);
    const bot = model.byId[selected];
    detail.append(el("h3", "detail-name", info.name));
    detail.append(el("p", "detail-role", info.role));
    const badge = el("p", "state state-" + bot.pose, stateLabel(bot));
    detail.append(badge);
    if (bot.asleep && bot.state) {
      detail.append(el("p", "detail-note", `Last reported state: ${labelFor(bot.state)}. Asleep is computed from the timestamp, not stored in the file.`));
    }
    if (bot.missing) {
      detail.append(el("p", "detail-note", "No entry in status.json for this bot."));
      return;
    }
    detail.append(el("p", "detail-task", bot.task));
    if (bot.reason) detail.append(el("p", "detail-reason", bot.reason));
    const time = document.createElement("time");
    if (bot.updatedAt) time.dateTime = bot.updatedAt;
    time.textContent = formatWhen(bot.updatedAtMs, model.now);
    const when = el("p", "detail-when");
    when.append("Updated ", time);
    detail.append(when);
  }

  function renderRoster() {
    clear(roster);
    const table = document.createElement("table");
    const caption = el("caption", "visually-hidden", "Assistant roster");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of ["Name", "State", "Task", "Updated", "Reason"]) {
      headRow.append(el("th", null, label));
    }
    head.append(headRow);
    headRow.children[0].scope = "col";
    for (const cell of headRow.children) cell.scope = "col";
    const body = document.createElement("tbody");
    for (const info of BOTS) {
      const bot = model.byId[info.id];
      const row = document.createElement("tr");
      if (selected === info.id) row.className = "is-selected";
      const nameCell = document.createElement("th");
      nameCell.scope = "row";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "row-button";
      button.textContent = info.name;
      button.setAttribute("aria-pressed", String(selected === info.id));
      button.addEventListener("click", () => onSelect(info.id));
      nameCell.append(button);
      row.append(nameCell);
      const stateCell = document.createElement("td");
      stateCell.append(el("span", "state state-" + bot.pose, stateLabel(bot)));
      if (bot.asleep && bot.state) {
        stateCell.append(el("span", "state-was", `Last said ${labelFor(bot.state).toLowerCase()}`));
      }
      row.append(stateCell);
      row.append(el("td", null, bot.missing ? "—" : bot.task));
      const updated = document.createElement("td");
      if (bot.updatedAt) {
        const time = document.createElement("time");
        time.dateTime = bot.updatedAt;
        time.textContent = formatWhen(bot.updatedAtMs, model.now);
        updated.append(time);
      } else {
        updated.textContent = "—";
      }
      row.append(updated);
      row.append(el("td", null, bot.reason || "—"));
      body.append(row);
    }
    table.append(caption, head, body);
    roster.append(table);
  }

  function render() {
    renderBanner();
    renderApprovals();
    renderHandoffs();
    renderDetail();
    renderRoster();
  }

  return {
    setModel(next) {
      model = next;
      render();
    },
    select(id) {
      selected = id;
      if (model) {
        renderDetail();
        renderRoster();
      }
    },
  };
}

function labelFor(state) {
  if (state === "working") return "Working";
  if (state === "free") return "Free";
  if (state === "blocked") return "Blocked";
  if (state === "waiting") return "Waiting";
  return state;
}
