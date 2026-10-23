import {
  WEEKDAYS,
  buildPlan,
  cardSchedule,
  csvToState,
  emptyState,
  exampleState,
  formatMoney,
  loadState,
  nextOnOrAfter,
  parseISO,
  saveState,
  stateToCsv,
  toCents,
  toISO,
} from "./planner.js";

const WEEK_COUNT_KEY = "paycheck-planner-weeks";
const FREQUENCY_LABEL = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  once: "One-time",
};
const BILL_HELP = {
  weekly: "Repeats every 7 days from this date.",
  biweekly: "Repeats every 14 days from this date.",
  monthly: "Repeats on this day each month.",
};
const INCOME_HELP = {
  ...BILL_HELP,
  once: "Arrives only on this date.",
};

const ui = {
  state: loadState(),
  weekCount: loadWeekCount(),
  selected: 0,
  editing: null,
};

const $ = (id) => document.getElementById(id);

function loadWeekCount() {
  try {
    return Number(localStorage.getItem(WEEK_COUNT_KEY)) === 12 ? 12 : 8;
  } catch {
    return 8;
  }
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseAmount(value) {
  if (value === "" || value == null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDay(iso) {
  return parseISO(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatRange(start, end) {
  const from = parseISO(start);
  const to = parseISO(end);
  const sameMonth = from.getMonth() === to.getMonth();
  const startText = from.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText = to.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startText} – ${endText}`;
}

function payFromName(payFrom) {
  if (!payFrom || payFrom === "checking") return "Checking";
  const card = ui.state.cards.find((item) => item.id === payFrom);
  return card ? card.name : "Checking";
}

function hasEntries() {
  return ui.state.bills.length + ui.state.incomes.length + ui.state.cards.length > 0;
}

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function leftoverNote(week) {
  if (week.incomeCents === 0 && week.setAsideCents === 0) return "Nothing is scheduled this week.";
  if (week.incomeCents === 0) return "No paycheck this week. Move the set-aside from money already in the account.";
  if (week.leftoverCents < 0) {
    return `This paycheck is short ${formatMoney(Math.abs(week.leftoverCents))}. Cover that from an earlier week's leftover.`;
  }
  return "Leftover is this week's income minus the set-aside. Spend or save it. Paying a bill later uses the set-aside, not this leftover.";
}

function reserveDetail(row) {
  const weeks = `${row.weeksElapsed} of ${row.weekCount} weeks`;
  if (row.status === "ready") return `Saved · ${weeks} · ${escapeHtml(row.payFromLabel)} pays ${formatDay(row.cashDate)}`;
  if (row.status === "due") {
    const where = row.payFrom === "checking"
      ? `leaves checking ${formatDay(row.dueDate)}`
      : `${escapeHtml(row.payFromLabel)} pays ${formatDay(row.cashDate)}`;
    return `Due this week · ${weeks} · ${where}`;
  }
  const where = row.payFrom === "checking"
    ? "Checking"
    : `${escapeHtml(row.payFromLabel)} pays ${formatDay(row.cashDate)}`;
  return `${weeks} · ${formatMoney(row.reservedCents)} of ${formatMoney(row.amountCents)} · due ${formatDay(row.dueDate)} · ${where}`;
}

function setFormError(message) {
  const el = $("form-error");
  el.hidden = !message;
  el.textContent = message || "";
}

function setBackupMessage(message, isError) {
  const el = $("backup-message");
  el.hidden = !message;
  el.textContent = message || "";
  el.classList.toggle("is-error", Boolean(isError));
}

function persist() {
  saveState(ui.state);
  setBackupMessage("");
  render();
}

function fillPayFrom(preferred) {
  const select = $("bill-pay-from");
  const current = preferred == null ? select.value : preferred;
  select.replaceChildren();
  select.add(new Option("Checking", "checking"));
  ui.state.cards.forEach((card) => select.add(new Option(card.name, card.id)));
  const exists = [...select.options].some((option) => option.value === current);
  select.value = exists ? current : "checking";
}

function updateBillHelp() {
  $("bill-help").textContent = BILL_HELP[$("bill-frequency").value] || BILL_HELP.monthly;
}

function updateIncomeHelp() {
  const frequency = $("income-frequency").value;
  $("income-help").textContent = INCOME_HELP[frequency] || INCOME_HELP.weekly;
  $("income-date-label").textContent = frequency === "once" ? "Date" : "A pay date";
}

function resetBillForm() {
  $("bill-form").reset();
  $("bill-frequency").value = "monthly";
  fillPayFrom("checking");
  updateBillHelp();
}

function resetIncomeForm() {
  $("income-form").reset();
  $("income-frequency").value = "weekly";
  updateIncomeHelp();
}

function resetCardForm() {
  $("card-form").reset();
}

function cancelEdit() {
  const editing = ui.editing;
  ui.editing = null;
  if (!editing || editing.type === "bill") resetBillForm();
  if (!editing || editing.type === "income") resetIncomeForm();
  if (!editing || editing.type === "card") resetCardForm();
  setFormError("");
  render();
}

function line(name, detail, amount, amountClass) {
  return `<li><div><b>${escapeHtml(name)}</b><small>${detail}</small></div><span class="money ${amountClass || ""}">${amount}</span></li>`;
}

function renderPlan() {
  const plan = buildPlan(ui.state, { weekCount: ui.weekCount });
  const selectedIndex = Math.min(ui.selected, plan.weeks.length - 1);
  ui.selected = selectedIndex;
  const week = plan.weeks[selectedIndex];
  const cardsDue = cardSchedule(plan);
  const leftoverClass = week.leftoverCents < 0 ? "is-negative" : "is-primary";

  const income = week.incomes.length
    ? `<ul class="lines">${week.incomes.map((item) => line(
      item.name,
      `${FREQUENCY_LABEL[item.frequency] || escapeHtml(item.frequency)} · ${formatDay(item.date)}`,
      formatMoney(item.amountCents),
      "in",
    )).join("")}</ul>`
    : `<p class="empty">No income this week.</p>`;

  const setAsides = week.setAsides.length
    ? `<ul class="lines">${week.setAsides.map((row) => line(
      row.name,
      `Week ${row.weekIndex} of ${row.weekCount} · due ${formatDay(row.dueDate)} · ${escapeHtml(row.payFromLabel)}`,
      formatMoney(row.amountCents),
      "out",
    )).join("")}</ul>`
    : `<p class="empty">No bill slices fall in this week.</p>`;

  const reserves = week.reserves.length
    ? `<ul class="lines">${week.reserves.map((row) => line(row.name, reserveDetail(row), formatMoney(row.reservedCents))).join("")}</ul>`
    : `<p class="empty">Nothing needs to be held for bills this week.</p>`;

  const payments = week.payments.length
    ? `<ul class="lines">${week.payments.map((payment) => {
      const detail = payment.kind === "card"
        ? `${formatDay(payment.date)} · ${payment.charges.map((charge) => `${escapeHtml(charge.name)} charged ${formatDay(charge.date)}`).join(", ")}`
        : `${formatDay(payment.date)} · Checking`;
      const title = payment.kind === "card" ? `Pay ${payment.name}` : payment.name;
      return line(title, detail, formatMoney(payment.amountCents), "out");
    }).join("")}</ul>`
    : `<p class="empty">Nothing is due out of the account this week.</p>`;

  const weeks = plan.weeks.map((item, index) => `
    <button type="button" class="week-row${index === selectedIndex ? " is-selected" : ""}" data-week="${index}" aria-pressed="${index === selectedIndex}">
      <span>${formatRange(item.start, item.end)}${index === 0 ? "<em>This week</em>" : ""}</span>
      <span>${formatMoney(item.incomeCents)}</span>
      <span>${formatMoney(item.setAsideCents)}</span>
      <span class="${item.leftoverCents < 0 ? "negative" : ""}">${formatMoney(item.leftoverCents)}</span>
      <span>${formatMoney(item.reserveCents)}</span>
    </button>`).join("");

  const cardBlock = cardsDue.length
    ? `<section><h3>Card payments</h3><ul class="lines">${cardsDue.map((payment) => line(
      payment.name,
      `Pay ${formatDay(payment.date)} · ${payment.charges.map((charge) => `${escapeHtml(charge.name)} ${formatMoney(charge.amountCents)} charged ${formatDay(charge.date)}`).join(", ")}`,
      formatMoney(payment.amountCents),
      "out",
    )).join("")}</ul></section>`
    : "";

  $("plan").innerHTML = `
    <div class="plan-heading">
      <div>
        <p class="eyebrow">${selectedIndex === 0 ? "This week" : "Selected week"}</p>
        <h2>${formatRange(week.start, week.end)}</h2>
      </div>
      <label class="inline-field">
        Weeks shown
        <select id="week-count">
          <option value="8"${ui.weekCount === 8 ? " selected" : ""}>8</option>
          <option value="12"${ui.weekCount === 12 ? " selected" : ""}>12</option>
        </select>
      </label>
    </div>
    <div class="metrics">
      <p><span>Subtract from this paycheck</span><strong>${formatMoney(week.setAsideCents)}</strong></p>
      <p><span>Keep in the account</span><strong>${formatMoney(week.reserveCents)}</strong></p>
      <p class="${leftoverClass}"><span>Left for expenses and savings</span><strong>${formatMoney(week.leftoverCents)}</strong></p>
    </div>
    <p class="note">${leftoverNote(week)}</p>
    <section><h3>Income this week</h3>${income}</section>
    <section><h3>Subtract from the paycheck</h3>${setAsides}</section>
    <section><h3>Keep in the account</h3>${reserves}</section>
    <section><h3>Comes out of the account</h3>${payments}</section>
    <section>
      <h3>Every week</h3>
      <div class="week-scroll">
        <div class="week-head"><span>Week</span><span>Income</span><span>Set aside</span><span>Left</span><span>In account</span></div>
        ${weeks}
      </div>
    </section>
    ${cardBlock}`;
}

function savedItem(name, detail, type, id) {
  return `<li><div><b>${escapeHtml(name)}</b><small>${detail}</small></div><div class="row-actions"><button type="button" data-edit="${type}" data-id="${escapeHtml(id)}">Edit</button><button type="button" data-delete="${type}" data-id="${escapeHtml(id)}">Delete</button></div></li>`;
}

function renderLists() {
  const bills = [...ui.state.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
  const incomes = [...ui.state.incomes].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  $("bill-list").innerHTML = bills.map((bill) => savedItem(
    bill.name,
    `${formatMoney(toCents(bill.amount))} · ${escapeHtml(FREQUENCY_LABEL[bill.frequency] || bill.frequency)} · next ${formatDay(nextOnOrAfter(bill.dueDate, bill.frequency))} · ${escapeHtml(payFromName(bill.payFrom))}`,
    "bill",
    bill.id,
  )).join("");
  $("income-list").innerHTML = incomes.map((income) => savedItem(
    income.name,
    `${formatMoney(toCents(income.amount))} · ${escapeHtml(FREQUENCY_LABEL[income.frequency] || income.frequency)} · ${formatDay(income.frequency === "once" ? income.date : nextOnOrAfter(income.date, income.frequency))}`,
    "income",
    income.id,
  )).join("");
  $("card-list").innerHTML = ui.state.cards.map((card) => savedItem(
    card.name,
    `Pay on day ${card.dueDay} of each month`,
    "card",
    card.id,
  )).join("");
}

function render() {
  $("layout").classList.toggle("has-data", hasEntries());
  $("clear-all").disabled = !hasEntries();
  $("week-start").value = String(ui.state.weekStartsOn);
  const editing = ui.editing;
  $("bill-submit").textContent = editing && editing.type === "bill" ? "Save bill" : "Add bill";
  $("income-submit").textContent = editing && editing.type === "income" ? "Save income" : "Add income";
  $("card-submit").textContent = editing && editing.type === "card" ? "Save card" : "Add card";
  $("bill-cancel").hidden = !(editing && editing.type === "bill");
  $("income-cancel").hidden = !(editing && editing.type === "income");
  $("card-cancel").hidden = !(editing && editing.type === "card");
  fillPayFrom();
  updateBillHelp();
  updateIncomeHelp();
  renderPlan();
  renderLists();
}

function editBill(id) {
  const bill = ui.state.bills.find((item) => item.id === id);
  if (!bill) return;
  ui.editing = { type: "bill", id };
  $("bill-name").value = bill.name;
  $("bill-amount").value = String(bill.amount);
  $("bill-due").value = bill.dueDate;
  $("bill-frequency").value = bill.frequency;
  fillPayFrom(ui.state.cards.some((card) => card.id === bill.payFrom) ? bill.payFrom : "checking");
  setFormError("");
  render();
  $("bill-name").focus();
}

function editIncome(id) {
  const income = ui.state.incomes.find((item) => item.id === id);
  if (!income) return;
  ui.editing = { type: "income", id };
  $("income-name").value = income.name;
  $("income-amount").value = String(income.amount);
  $("income-date").value = income.date;
  $("income-frequency").value = income.frequency;
  setFormError("");
  render();
  $("income-name").focus();
}

function editCard(id) {
  const card = ui.state.cards.find((item) => item.id === id);
  if (!card) return;
  ui.editing = { type: "card", id };
  $("card-name").value = card.name;
  $("card-due-day").value = String(card.dueDay);
  setFormError("");
  render();
  $("card-name").focus();
}

function saveBill(event) {
  event.preventDefault();
  const amount = parseAmount($("bill-amount").value);
  const name = $("bill-name").value.trim();
  const dueDate = $("bill-due").value;
  if (!name || amount == null || !dueDate) {
    setFormError("Enter a name, an amount, and a due date for the bill.");
    return;
  }
  const next = {
    id: ui.editing && ui.editing.type === "bill" ? ui.editing.id : uid(),
    name,
    amount,
    dueDate,
    frequency: $("bill-frequency").value,
    payFrom: $("bill-pay-from").value || "checking",
  };
  ui.state = {
    ...ui.state,
    bills: ui.editing && ui.editing.type === "bill"
      ? ui.state.bills.map((bill) => (bill.id === next.id ? next : bill))
      : [...ui.state.bills, next],
  };
  ui.editing = null;
  resetBillForm();
  setFormError("");
  persist();
}

function saveIncome(event) {
  event.preventDefault();
  const amount = parseAmount($("income-amount").value);
  const name = $("income-name").value.trim();
  const date = $("income-date").value;
  if (!name || amount == null || !date) {
    setFormError("Enter a name, an amount, and a date for the income.");
    return;
  }
  const next = {
    id: ui.editing && ui.editing.type === "income" ? ui.editing.id : uid(),
    name,
    amount,
    date,
    frequency: $("income-frequency").value,
  };
  ui.state = {
    ...ui.state,
    incomes: ui.editing && ui.editing.type === "income"
      ? ui.state.incomes.map((income) => (income.id === next.id ? next : income))
      : [...ui.state.incomes, next],
  };
  ui.editing = null;
  resetIncomeForm();
  setFormError("");
  persist();
}

function saveCard(event) {
  event.preventDefault();
  const dueDay = Number($("card-due-day").value);
  const name = $("card-name").value.trim();
  if (!name || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    setFormError("Enter a card name and the day of the month the card is paid, from 1 to 31.");
    return;
  }
  const next = {
    id: ui.editing && ui.editing.type === "card" ? ui.editing.id : uid(),
    name,
    dueDay,
  };
  const previousId = next.id;
  ui.state = {
    ...ui.state,
    cards: ui.editing && ui.editing.type === "card"
      ? ui.state.cards.map((card) => (card.id === previousId ? next : card))
      : [...ui.state.cards, next],
  };
  ui.editing = null;
  resetCardForm();
  setFormError("");
  persist();
}

function deleteBy(type, id) {
  if (type === "bill") {
    ui.state = { ...ui.state, bills: ui.state.bills.filter((bill) => bill.id !== id) };
  } else if (type === "income") {
    ui.state = { ...ui.state, incomes: ui.state.incomes.filter((income) => income.id !== id) };
  } else if (type === "card") {
    ui.state = {
      ...ui.state,
      cards: ui.state.cards.filter((card) => card.id !== id),
      bills: ui.state.bills.map((bill) => (bill.payFrom === id ? { ...bill, payFrom: "checking" } : bill)),
    };
  }
  if (ui.editing && ui.editing.type === type && ui.editing.id === id) {
    ui.editing = null;
    if (type === "bill") resetBillForm();
    if (type === "income") resetIncomeForm();
    if (type === "card") resetCardForm();
  }
  setFormError("");
  persist();
}

function downloadCsv() {
  const csv = stateToCsv(ui.state);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paycheck-planner-${toISO(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  const count = ui.state.bills.length + ui.state.incomes.length + ui.state.cards.length;
  setBackupMessage(count
    ? `Downloaded ${countLabel(ui.state.bills.length, "bill", "bills")}, ${countLabel(ui.state.incomes.length, "income entry", "income entries")}, and ${countLabel(ui.state.cards.length, "card", "cards")}. That file is the backup.`
    : "Downloaded an empty backup.");
}

function uploadCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const next = csvToState(String(reader.result));
      if (hasEntries() && !window.confirm("Replace the bills, income, and cards in this browser with this file?")) return;
      ui.state = next;
      ui.selected = 0;
      ui.editing = null;
      resetBillForm();
      resetIncomeForm();
      resetCardForm();
      setFormError("");
      saveState(ui.state);
      render();
      setBackupMessage(`Restored ${countLabel(next.bills.length, "bill", "bills")}, ${countLabel(next.incomes.length, "income entry", "income entries")}, and ${countLabel(next.cards.length, "card", "cards")}. Saved in this browser.`);
    } catch (error) {
      setBackupMessage(error.message || "That file could not be read.", true);
    }
  };
  reader.onerror = () => setBackupMessage("That file could not be read.", true);
  reader.readAsText(file);
}

function fillWeekStart() {
  const select = $("week-start");
  WEEKDAYS.forEach((name, index) => select.add(new Option(name, String(index))));
}

function bind() {
  fillWeekStart();
  $("bill-form").addEventListener("submit", saveBill);
  $("income-form").addEventListener("submit", saveIncome);
  $("card-form").addEventListener("submit", saveCard);
  $("bill-cancel").addEventListener("click", cancelEdit);
  $("income-cancel").addEventListener("click", cancelEdit);
  $("card-cancel").addEventListener("click", cancelEdit);
  $("bill-frequency").addEventListener("change", updateBillHelp);
  $("income-frequency").addEventListener("change", updateIncomeHelp);
  $("week-start").addEventListener("change", (event) => {
    ui.state = { ...ui.state, weekStartsOn: Number(event.target.value) };
    persist();
  });
  $("load-example").addEventListener("click", () => {
    if (hasEntries() && !window.confirm("Replace your current bills, income, and cards with the example?")) return;
    ui.state = exampleState(new Date());
    ui.selected = 0;
    ui.editing = null;
    resetBillForm();
    resetIncomeForm();
    resetCardForm();
    setFormError("");
    persist();
  });
  $("clear-all").addEventListener("click", () => {
    if (!hasEntries()) return;
    if (!window.confirm("Remove all bills, income, and cards stored in this browser?")) return;
    ui.state = emptyState();
    ui.selected = 0;
    ui.editing = null;
    resetBillForm();
    resetIncomeForm();
    resetCardForm();
    setFormError("");
    persist();
  });
  $("download-csv").addEventListener("click", downloadCsv);
  $("upload-csv").addEventListener("click", () => $("csv-file").click());
  $("csv-file").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (file) uploadCsv(file);
  });
  document.addEventListener("click", (event) => {
    const week = event.target.closest("[data-week]");
    if (week && $("plan").contains(week)) {
      ui.selected = Number(week.dataset.week);
      render();
      return;
    }
    const edit = event.target.closest("[data-edit]");
    if (edit) {
      const id = edit.dataset.id;
      if (edit.dataset.edit === "bill") editBill(id);
      if (edit.dataset.edit === "income") editIncome(id);
      if (edit.dataset.edit === "card") editCard(id);
      return;
    }
    const remove = event.target.closest("[data-delete]");
    if (remove) deleteBy(remove.dataset.delete, remove.dataset.id);
  });
  $("plan").addEventListener("change", (event) => {
    if (event.target.id !== "week-count") return;
    ui.weekCount = Number(event.target.value) === 12 ? 12 : 8;
    try { localStorage.setItem(WEEK_COUNT_KEY, String(ui.weekCount)); } catch { /* keep the choice for this visit */ }
    render();
  });
}

bind();
render();
