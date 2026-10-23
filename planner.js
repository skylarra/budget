// Weekly paycheck plan.
//
// A bill is split across the weeks between due dates. Each of those weeks,
// one slice comes out of the paycheck. The account should already hold every
// slice for weeks that have started, so a bill due sooner (more weeks elapsed)
// needs more cash than a bill due later. Slices in one cycle add up to the
// bill exactly.
//
// Checking pays the bill on its due date. A credit card is charged on the due
// date and paid later, on the card's due day. Leftover is income minus the
// slices — card and checking payments spend money that was already set aside.

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISO(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date, delta, dayOfMonth) {
  const first = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(dayOfMonth, last));
}

export function startOfWeek(date, weekStartsOn) {
  const d = startOfDay(date);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(d, -diff);
}

export function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars.toLocaleString("en-US")}.${rem}`;
}

export function splitCents(total, count) {
  const n = Math.max(1, count);
  const base = Math.floor(total / n);
  let remainder = total - base * n;
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    parts.push(base + extra);
  }
  return parts;
}

function shift(date, frequency, direction, dayOfMonth) {
  if (frequency === "weekly") return addDays(date, 7 * direction);
  if (frequency === "biweekly") return addDays(date, 14 * direction);
  if (frequency === "monthly") return addMonths(date, direction, dayOfMonth);
  return date;
}

function datesBetween(anchorISO, frequency, from, to) {
  const anchor = startOfDay(parseISO(anchorISO));
  if (Number.isNaN(anchor.getTime())) return [];
  if (frequency === "once") {
    return anchor >= from && anchor <= to ? [anchor] : [];
  }
  if (!["weekly", "biweekly", "monthly"].includes(frequency)) return [];

  const dayOfMonth = anchor.getDate();
  let cursor = anchor;
  let guard = 0;
  while (cursor > from && guard < 800) {
    const prev = shift(cursor, frequency, -1, dayOfMonth);
    if (prev >= cursor) break;
    cursor = prev;
    guard += 1;
  }

  const dates = [];
  guard = 0;
  while (cursor <= to && guard < 800) {
    if (cursor >= from) dates.push(cursor);
    const next = shift(cursor, frequency, 1, dayOfMonth);
    if (next <= cursor) break;
    cursor = next;
    guard += 1;
  }
  return dates;
}

export function weekStartsAfterThrough(afterExclusive, throughInclusive, weekStartsOn) {
  const dates = [];
  let cursor = startOfWeek(addDays(afterExclusive, 1), weekStartsOn);
  if (cursor <= afterExclusive) cursor = addDays(cursor, 7);
  let guard = 0;
  while (cursor <= throughInclusive && guard < 60) {
    dates.push(cursor);
    cursor = addDays(cursor, 7);
    guard += 1;
  }
  return dates;
}

function cardDueOnOrAfter(dueDay, chargeDate) {
  const day = Math.min(31, Math.max(1, Number(dueDay) || 1));
  const sameMonth = addMonths(new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1), 0, day);
  if (sameMonth >= chargeDate) return sameMonth;
  return addMonths(new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1), 1, day);
}

function occurrenceFor(bill, due, cardsById, weekStartsOn) {
  const dayOfMonth = parseISO(bill.dueDate).getDate();
  const prev = shift(due, bill.frequency, -1, dayOfMonth);
  let weekDates = weekStartsAfterThrough(prev, due, weekStartsOn);
  if (weekDates.length === 0) weekDates = [startOfWeek(due, weekStartsOn)];
  const amountCents = toCents(bill.amount);
  const slices = splitCents(amountCents, weekDates.length);
  const card = bill.payFrom && bill.payFrom !== "checking" ? cardsById[bill.payFrom] : null;
  const cashDate = card ? cardDueOnOrAfter(card.dueDay, due) : due;
  return {
    key: `${bill.id}|${toISO(due)}`,
    billId: bill.id,
    name: bill.name,
    amountCents,
    due,
    weekDates,
    slices,
    cashDate,
    payFrom: card ? card.id : "checking",
    payFromLabel: card ? card.name : "Checking",
  };
}

function collectOccurrences(state, from, to, weekStartsOn) {
  const cardsById = Object.fromEntries((state.cards || []).map((card) => [card.id, card]));
  const events = [];
  (state.bills || []).forEach((bill) => {
    if (!bill || !bill.dueDate || !bill.name) return;
    if (toCents(bill.amount) <= 0) return;
    datesBetween(bill.dueDate, bill.frequency, from, to).forEach((due) => {
      events.push(occurrenceFor(bill, due, cardsById, weekStartsOn));
    });
  });
  return events;
}

function collectIncome(state, from, to) {
  const rows = [];
  (state.incomes || []).forEach((income) => {
    if (!income || !income.date || !income.name) return;
    const amountCents = toCents(income.amount);
    if (amountCents <= 0) return;
    datesBetween(income.date, income.frequency, from, to).forEach((date) => {
      rows.push({
        id: income.id,
        name: income.name,
        amountCents,
        date: toISO(date),
        frequency: income.frequency,
      });
    });
  });
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return rows;
}

function summarizeWeek(weekStart, weekEnd, events, incomes) {
  const setAsides = [];
  const reserves = [];
  const payments = [];
  const cardPayments = new Map();

  events.forEach((event) => {
    event.weekDates.forEach((weekDate, index) => {
      if (weekDate.getTime() !== weekStart.getTime()) return;
      setAsides.push({
        key: event.key,
        billId: event.billId,
        name: event.name,
        amountCents: event.slices[index],
        weekIndex: index + 1,
        weekCount: event.weekDates.length,
        dueDate: toISO(event.due),
        payFromLabel: event.payFromLabel,
      });
    });

    if (event.cashDate < weekStart) return;

    const dueThisWeekOrEarlier = event.due <= weekEnd;
    let reservedCents = 0;
    let weeksElapsed = 0;
    let status = "saving";

    if (dueThisWeekOrEarlier) {
      reservedCents = event.amountCents;
      weeksElapsed = event.weekDates.length;
      status = event.due < weekStart ? "ready" : "due";
    } else {
      const elapsedDates = event.weekDates.filter((weekDate) => weekDate <= weekEnd);
      weeksElapsed = elapsedDates.length;
      if (weeksElapsed === 0) return;
      reservedCents = event.slices.slice(0, weeksElapsed).reduce((sum, part) => sum + part, 0);
    }

    reserves.push({
      key: `${event.key}|${status}`,
      billId: event.billId,
      name: event.name,
      reservedCents,
      amountCents: event.amountCents,
      weeksElapsed,
      weekCount: event.weekDates.length,
      dueDate: toISO(event.due),
      cashDate: toISO(event.cashDate),
      payFrom: event.payFrom,
      payFromLabel: event.payFromLabel,
      status,
    });

    if (event.cashDate >= weekStart && event.cashDate <= weekEnd) {
      if (event.payFrom === "checking") {
        payments.push({
          key: event.key,
          kind: "bill",
          name: event.name,
          amountCents: event.amountCents,
          date: toISO(event.cashDate),
          payFromLabel: "Checking",
          charges: [],
        });
      } else {
        const mapKey = `${event.payFrom}|${toISO(event.cashDate)}`;
        if (!cardPayments.has(mapKey)) {
          cardPayments.set(mapKey, {
            key: mapKey,
            kind: "card",
            cardId: event.payFrom,
            name: event.payFromLabel,
            amountCents: 0,
            date: toISO(event.cashDate),
            payFromLabel: event.payFromLabel,
            charges: [],
          });
        }
        const row = cardPayments.get(mapKey);
        row.amountCents += event.amountCents;
        row.charges.push({
          name: event.name,
          amountCents: event.amountCents,
          date: toISO(event.due),
        });
      }
    }
  });

  cardPayments.forEach((row) => {
    row.charges.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    payments.push(row);
  });

  setAsides.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
  reserves.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name) || a.status.localeCompare(b.status));
  payments.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  const weekIncomes = incomes.filter((income) => {
    const date = parseISO(income.date);
    return date >= weekStart && date <= weekEnd;
  });
  const incomeCents = weekIncomes.reduce((sum, income) => sum + income.amountCents, 0);
  const setAsideCents = setAsides.reduce((sum, row) => sum + row.amountCents, 0);
  const reserveCents = reserves.reduce((sum, row) => sum + row.reservedCents, 0);
  const paymentCents = payments.reduce((sum, row) => sum + row.amountCents, 0);

  return {
    start: toISO(weekStart),
    end: toISO(weekEnd),
    incomes: weekIncomes,
    incomeCents,
    setAsides,
    setAsideCents,
    leftoverCents: incomeCents - setAsideCents,
    reserves,
    reserveCents,
    payments,
    paymentCents,
  };
}

export function buildPlan(state, options = {}) {
  const weekStartsOn = Number.isInteger(state.weekStartsOn) ? state.weekStartsOn : 1;
  const weekCount = options.weekCount || 8;
  const start = startOfDay(options.startDate || new Date());
  const first = startOfWeek(start, weekStartsOn);
  const last = addDays(first, weekCount * 7 - 1);
  const horizonFrom = addDays(first, -400);
  const horizonTo = addDays(last, 400);
  const events = collectOccurrences(state, horizonFrom, horizonTo, weekStartsOn);
  const incomes = collectIncome(state, first, last);

  const weeks = [];
  for (let i = 0; i < weekCount; i += 1) {
    const weekStart = addDays(first, i * 7);
    weeks.push(summarizeWeek(weekStart, addDays(weekStart, 6), events, incomes));
  }
  return { weeks, weekStartsOn };
}

export function nextOnOrAfter(anchorISO, frequency, today = new Date()) {
  if (frequency === "once") return anchorISO;
  const day = startOfDay(today);
  const dates = datesBetween(anchorISO, frequency, addDays(day, -400), addDays(day, 400));
  const upcoming = dates.find((date) => date >= day);
  return upcoming ? toISO(upcoming) : anchorISO;
}

export function cardSchedule(plan) {
  const rows = [];
  plan.weeks.forEach((week) => {
    week.payments.forEach((payment) => {
      if (payment.kind === "card") rows.push(payment);
    });
  });
  return rows;
}

export function exampleState(today = new Date()) {
  const day = startOfDay(today);
  const electricDue = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  const gymDue = new Date(day.getFullYear(), day.getMonth() + 1, 8);
  const netflixDue = new Date(day.getFullYear(), day.getMonth(), 18);
  const friday = addDays(startOfWeek(day, 1), 4);
  return {
    weekStartsOn: 1,
    cards: [{ id: "visa", name: "Visa", dueDay: 25 }],
    bills: [
      {
        id: "electric",
        name: "Electric",
        amount: 120,
        dueDate: toISO(electricDue),
        frequency: "monthly",
        payFrom: "checking",
      },
      {
        id: "gym",
        name: "Gym",
        amount: 40,
        dueDate: toISO(gymDue),
        frequency: "monthly",
        payFrom: "checking",
      },
      {
        id: "netflix",
        name: "Netflix",
        amount: 15.99,
        dueDate: toISO(netflixDue),
        frequency: "monthly",
        payFrom: "visa",
      },
    ],
    incomes: [
      {
        id: "paycheck",
        name: "Paycheck",
        amount: 1000,
        date: toISO(friday),
        frequency: "weekly",
      },
    ],
  };
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function emptyState() {
  return { weekStartsOn: 1, bills: [], incomes: [], cards: [] };
}

const STORAGE_KEY = "paycheck-planner-v1";

export function loadState() {
  try {
    if (typeof localStorage === "undefined") return emptyState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      weekStartsOn: Number.isInteger(parsed.weekStartsOn) ? parsed.weekStartsOn : 1,
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const CSV_HEADERS = ["type", "name", "amount", "date", "frequency", "paid_from", "card_due_day", "week_starts"];

const FREQUENCY_ALIASES = {
  weekly: "weekly",
  week: "weekly",
  biweekly: "biweekly",
  "bi-weekly": "biweekly",
  monthly: "monthly",
  month: "monthly",
  once: "once",
  "one-time": "once",
  onetime: "once",
};

const WEEKDAY_ALIASES = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(cells) {
  return cells.map(csvEscape).join(",");
}

export function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (quoted) {
      if (char === "\"") {
        if (src[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === "\"") {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (quoted) throw new Error("The file has an unfinished quoted value.");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ""));
}

function cell(row, index) {
  if (index == null || index < 0) return "";
  return row[index] == null ? "" : String(row[index]).trim();
}

function normalizeFrequency(value, allowed) {
  const key = String(value).trim().toLowerCase().replace(/[\s_]+/g, "-");
  const frequency = FREQUENCY_ALIASES[key];
  if (!frequency || !allowed.includes(frequency)) return null;
  return frequency;
}

function parseMoneyCell(value) {
  const cleaned = String(value).replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function parseDateCell(value) {
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = parseISO(text);
    return toISO(date) === text ? text : null;
  }
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!slash) return null;
  let year = Number(slash[3]);
  if (year < 100) year += 2000;
  const month = Number(slash[1]);
  const day = Number(slash[2]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toISO(date);
}

function parseWeekStart(value) {
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const day = Number(text);
    return day >= 0 && day <= 6 ? day : null;
  }
  return Object.prototype.hasOwnProperty.call(WEEKDAY_ALIASES, text) ? WEEKDAY_ALIASES[text] : null;
}

export function stateToCsv(state) {
  const lines = [CSV_HEADERS.join(",")];
  const weekName = WEEKDAYS[Number.isInteger(state.weekStartsOn) ? state.weekStartsOn : 1];
  lines.push(csvRow(["settings", "", "", "", "", "", "", weekName]));
  (state.cards || []).forEach((card) => {
    lines.push(csvRow(["card", card.name, "", "", "", "", card.dueDay, ""]));
  });
  (state.bills || []).forEach((bill) => {
    const card = (state.cards || []).find((item) => item.id === bill.payFrom);
    const paidFrom = card ? card.name : "checking";
    lines.push(csvRow([
      "bill",
      bill.name,
      Number(bill.amount).toFixed(2),
      bill.dueDate,
      bill.frequency,
      paidFrom,
      "",
      "",
    ]));
  });
  (state.incomes || []).forEach((income) => {
    lines.push(csvRow([
      "income",
      income.name,
      Number(income.amount).toFixed(2),
      income.date,
      income.frequency,
      "",
      "",
      "",
    ]));
  });
  return `${lines.join("\r\n")}\r\n`;
}

export function csvToState(text) {
  const source = String(text);
  if (!source.trim()) throw new Error("The file is empty.");
  if (!source.includes(",") && source.includes(";")) {
    throw new Error("Use commas between columns. This file looks like it uses semicolons.");
  }

  const table = parseCsv(source);
  if (!table.length) throw new Error("The file is empty.");
  const header = table[0].map((name) => String(name).trim().toLowerCase());
  const missing = CSV_HEADERS.filter((name) => !header.includes(name));
  if (missing.length) {
    throw new Error(`Missing column ${missing.map((name) => `"${name}"`).join(", ")}. Download a backup from this page and use those column names.`);
  }
  const index = Object.fromEntries(header.map((name, position) => [name, position]));

  const errors = [];
  const cards = [];
  const bills = [];
  const incomes = [];
  let weekStartsOn = 1;
  const cardNames = new Set();

  table.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const type = cell(row, index.type).toLowerCase();
    const name = cell(row, index.name);
    const label = name ? `"${name}"` : `row ${rowNumber}`;
    const week = cell(row, index.week_starts);
    if (week) {
      const parsed = parseWeekStart(week);
      if (parsed == null) errors.push(`Row ${rowNumber}: week_starts must be a weekday name, like Monday.`);
      else weekStartsOn = parsed;
    }

    if (type === "settings") return;

    if (type === "card") {
      const dueDay = Number(cell(row, index.card_due_day));
      if (!name) {
        errors.push(`Row ${rowNumber}: a card needs a name.`);
        return;
      }
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        errors.push(`Row ${rowNumber}: card ${label} needs a payment day from 1 to 31.`);
        return;
      }
      const key = name.toLowerCase();
      if (cardNames.has(key)) {
        errors.push(`Row ${rowNumber}: card ${label} is listed more than once.`);
        return;
      }
      cardNames.add(key);
      cards.push({ id: `card-${cards.length + 1}`, name, dueDay });
      return;
    }

    if (type === "bill" || type === "income") {
      const amount = parseMoneyCell(cell(row, index.amount));
      const date = parseDateCell(cell(row, index.date));
      const allowed = type === "bill" ? ["weekly", "biweekly", "monthly"] : ["weekly", "biweekly", "monthly", "once"];
      const frequency = normalizeFrequency(cell(row, index.frequency), allowed);
      if (!name) errors.push(`Row ${rowNumber}: a ${type} needs a name.`);
      if (amount == null) errors.push(`Row ${rowNumber}: ${type} ${label} needs an amount greater than 0.`);
      if (!date) errors.push(`Row ${rowNumber}: ${type} ${label} needs a date like 2026-11-01 or 11/1/2026.`);
      if (!frequency) {
        errors.push(type === "bill"
          ? `Row ${rowNumber}: ${type} ${label} must repeat weekly, biweekly, or monthly.`
          : `Row ${rowNumber}: ${type} ${label} must repeat weekly, biweekly, monthly, or one-time.`);
      }
      if (!name || amount == null || !date || !frequency) return;
      if (type === "bill") {
        bills.push({
          name,
          amount,
          dueDate: date,
          frequency,
          paidFrom: cell(row, index.paid_from) || "checking",
        });
      } else {
        incomes.push({ name, amount, date, frequency });
      }
      return;
    }

    errors.push(`Row ${rowNumber}: unknown type "${type || "(blank)"}". Use settings, card, bill, or income.`);
  });

  const linkedBills = bills.map((bill, position) => {
    const paid = bill.paidFrom.trim();
    if (!paid || paid.toLowerCase() === "checking") {
      return {
        id: `bill-${position + 1}`,
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.dueDate,
        frequency: bill.frequency,
        payFrom: "checking",
      };
    }
    const card = cards.find((item) => item.name.toLowerCase() === paid.toLowerCase());
    if (!card) {
      errors.push(`Bill "${bill.name}" is paid from "${paid}", and that card is not in the file.`);
      return null;
    }
    return {
      id: `bill-${position + 1}`,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
      frequency: bill.frequency,
      payFrom: card.id,
    };
  }).filter(Boolean);

  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  return {
    weekStartsOn,
    cards,
    bills: linkedBills,
    incomes: incomes.map((income, position) => ({
      id: `income-${position + 1}`,
      name: income.name,
      amount: income.amount,
      date: income.date,
      frequency: income.frequency,
    })),
  };
}
