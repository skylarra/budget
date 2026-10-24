import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlan,
  cardSchedule,
  csvToState,
  exampleState,
  splitCents,
  stateToCsv,
  toCents,
  weekStartsAfterThrough,
} from "./planner.js";

function on(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function match(actual, expected) {
  assert.ok(actual, "missing value");
  Object.entries(expected).forEach(([key, value]) => {
    assert.deepEqual(actual[key], value, key);
  });
}

const octoberPlanInput = {
  weekStartsOn: 1,
  cards: [{ id: "visa", name: "Visa", dueDay: 25 }],
  bills: [
    { id: "electric", name: "Electric", amount: 120, dueDate: "2026-11-01", frequency: "monthly", payFrom: "checking" },
    { id: "gym", name: "Gym", amount: 40, dueDate: "2026-11-08", frequency: "monthly", payFrom: "checking" },
    { id: "netflix", name: "Netflix", amount: 15.99, dueDate: "2026-10-18", frequency: "monthly", payFrom: "visa" },
  ],
  incomes: [
    { id: "paycheck", name: "Paycheck", amount: 1000, date: "2026-10-23", frequency: "weekly" },
  ],
};

describe("paycheck plan", () => {
  it("splits cents so the slices add up to the bill", () => {
    assert.deepEqual(splitCents(1001, 3), [334, 334, 333]);
    assert.equal(splitCents(toCents(120), 4).reduce((sum, part) => sum + part, 0), 12000);
  });

  it("counts Mondays after the previous due date through the next one", () => {
    const weeks = weekStartsAfterThrough(on("2026-10-01"), on("2026-11-01"), 1).map((date) => date.getDate());
    assert.deepEqual(weeks, [5, 12, 19, 26]);
    const gym = weekStartsAfterThrough(on("2026-10-08"), on("2026-11-08"), 1).map((date) => date.getDate());
    assert.deepEqual(gym, [12, 19, 26, 2]);
  });

  it("keeps 3 weeks of electric and 2 weeks of gym on October 22", () => {
    const plan = buildPlan(octoberPlanInput, { startDate: on("2026-10-22"), weekCount: 8 });
    const week = plan.weeks[0];

    assert.equal(week.start, "2026-10-19");
    assert.equal(week.end, "2026-10-25");
    match(week.reserves.find((row) => row.name === "Electric"), { weeksElapsed: 3, weekCount: 4, reservedCents: 9000, status: "saving", dueDate: "2026-11-01" });
    match(week.reserves.find((row) => row.name === "Gym"), { weeksElapsed: 2, weekCount: 4, reservedCents: 2000, status: "saving", dueDate: "2026-11-08" });
    match(week.setAsides.find((row) => row.name === "Electric"), { amountCents: 3000, weekIndex: 3, weekCount: 4 });
    match(week.setAsides.find((row) => row.name === "Gym"), { amountCents: 1000, weekIndex: 2, weekCount: 4 });

    match(week.reserves.find((row) => row.name === "Netflix" && row.status === "ready"), { reservedCents: 1599, cashDate: "2026-10-25", dueDate: "2026-10-18" });
    match(week.reserves.find((row) => row.name === "Netflix" && row.status === "saving"), {
      weeksElapsed: 1,
      weekCount: 5,
      reservedCents: 320,
      dueDate: "2026-11-18",
      cashDate: "2026-11-25",
    });

    assert.equal(week.setAsideCents, 4320);
    assert.equal(week.incomeCents, 100000);
    assert.equal(week.leftoverCents, 95680);
    assert.equal(week.reserveCents, 12919);
    assert.equal(week.payments.length, 1);
    match(week.payments[0], { kind: "card", name: "Visa", date: "2026-10-25", amountCents: 1599 });
    match(week.payments[0].charges[0], { name: "Netflix", amountCents: 1599, date: "2026-10-18" });
  });

  it("the October 22 example matches that week count", () => {
    const plan = buildPlan(exampleState(on("2026-10-22")), { startDate: on("2026-10-22") });
    const week = plan.weeks[0];
    assert.equal(week.reserves.find((row) => row.name === "Electric").weeksElapsed, 3);
    assert.equal(week.reserves.find((row) => row.name === "Gym").weeksElapsed, 2);
  });

  it("pays the full electric bill the week it is due, then starts the next cycle", () => {
    const plan = buildPlan(octoberPlanInput, { startDate: on("2026-10-22"), weekCount: 4 });
    const dueWeek = plan.weeks[1];
    assert.equal(dueWeek.start, "2026-10-26");
    match(dueWeek.reserves.find((row) => row.name === "Electric"), { status: "due", reservedCents: 12000, weeksElapsed: 4 });
    match(dueWeek.payments[0], { kind: "bill", name: "Electric", amountCents: 12000, date: "2026-11-01" });
    match(dueWeek.reserves.find((row) => row.name === "Gym"), { weeksElapsed: 3, reservedCents: 3000 });

    const following = plan.weeks[2];
    assert.equal(following.start, "2026-11-02");
    assert.equal(following.reserves.find((row) => row.name === "Electric" && row.dueDate === "2026-11-01"), undefined);
    match(following.reserves.find((row) => row.name === "Electric"), {
      status: "saving",
      dueDate: "2026-12-01",
      weeksElapsed: 1,
      weekCount: 5,
      reservedCents: 2400,
    });
    assert.equal(following.reserves.find((row) => row.name === "Netflix" && row.status === "ready"), undefined);
  });

  it("groups every charge on a card into the card payment", () => {
    const plan = buildPlan({
      ...octoberPlanInput,
      bills: [
        ...octoberPlanInput.bills,
        { id: "phone", name: "Phone", amount: 45, dueDate: "2026-10-20", frequency: "monthly", payFrom: "visa" },
      ],
    }, { startDate: on("2026-10-22"), weekCount: 2 });

    const visa = plan.weeks[0].payments.find((payment) => payment.kind === "card");
    assert.equal(visa.amountCents, 1599 + 4500);
    assert.deepEqual(visa.charges.map((charge) => charge.name), ["Netflix", "Phone"]);
    assert.ok(cardSchedule(plan).map((payment) => payment.amountCents).includes(6099));
  });

  it("a weekly bill is set aside in full the week it is due", () => {
    const plan = buildPlan({
      weekStartsOn: 1,
      cards: [],
      bills: [{ id: "bus", name: "Bus", amount: 25, dueDate: "2026-10-23", frequency: "weekly", payFrom: "checking" }],
      incomes: [],
    }, { startDate: on("2026-10-22"), weekCount: 2 });

    match(plan.weeks[0].setAsides[0], { amountCents: 2500, weekIndex: 1, weekCount: 1 });
    match(plan.weeks[0].reserves[0], { reservedCents: 2500, status: "due" });
    match(plan.weeks[0].payments[0], { name: "Bus", amountCents: 2500, date: "2026-10-23" });
    assert.equal(plan.weeks[0].leftoverCents, -2500);
  });

  it("biweekly and one-time income land only on their weeks", () => {
    const plan = buildPlan({
      weekStartsOn: 1,
      cards: [],
      bills: [{ id: "gym", name: "Gym", amount: 40, dueDate: "2026-11-08", frequency: "biweekly", payFrom: "checking" }],
      incomes: [
        { id: "job", name: "Job", amount: 2000, date: "2026-10-23", frequency: "biweekly" },
        { id: "bonus", name: "Bonus", amount: 100, date: "2026-10-24", frequency: "once" },
        { id: "rent-help", name: "Help", amount: 50, date: "2026-11-01", frequency: "monthly" },
      ],
    }, { startDate: on("2026-10-22"), weekCount: 4 });

    assert.deepEqual(plan.weeks[0].incomes.map((income) => income.name), ["Job", "Bonus"]);
    assert.equal(plan.weeks[0].incomeCents, 210000);
    assert.deepEqual(plan.weeks[1].incomes.map((income) => income.name), ["Help"]);
    assert.equal(plan.weeks[1].incomeCents, 5000);
    assert.deepEqual(plan.weeks[2].incomes.map((income) => income.name), ["Job"]);
    assert.equal(plan.weeks[3].incomeCents, 0);
    match(plan.weeks[0].reserves.find((row) => row.name === "Gym"), {
      status: "due",
      dueDate: "2026-10-25",
      weekCount: 2,
      weeksElapsed: 2,
      reservedCents: 4000,
    });
    match(plan.weeks[0].setAsides.find((row) => row.name === "Gym"), { amountCents: 2000, weekIndex: 2, weekCount: 2 });
    match(plan.weeks[1].reserves.find((row) => row.name === "Gym"), {
      status: "saving",
      dueDate: "2026-11-08",
      weeksElapsed: 1,
      weekCount: 2,
      reservedCents: 2000,
    });
  });

  it("a missing card is treated as checking", () => {
    const plan = buildPlan({
      weekStartsOn: 1,
      cards: [],
      bills: [{ id: "netflix", name: "Netflix", amount: 16, dueDate: "2026-11-18", frequency: "monthly", payFrom: "visa" }],
      incomes: [],
    }, { startDate: on("2026-10-22"), weekCount: 1 });

    assert.equal(plan.weeks[0].reserves.every((row) => row.payFromLabel === "Checking"), true);
  });
});

describe("csv backup", () => {
  it("round-trips the example into the same weekly plan", () => {
    const original = exampleState(on("2026-10-22"));
    const restored = csvToState(stateToCsv(original));
    const before = buildPlan(original, { startDate: on("2026-10-22") }).weeks[0];
    const after = buildPlan(restored, { startDate: on("2026-10-22") }).weeks[0];
    assert.equal(restored.weekStartsOn, 1);
    assert.equal(restored.cards[0].name, "Visa");
    assert.equal(restored.cards[0].dueDay, 25);
    assert.equal(restored.bills.find((bill) => bill.name === "Netflix").payFrom, restored.cards[0].id);
    assert.equal(after.setAsideCents, before.setAsideCents);
    assert.equal(after.reserveCents, before.reserveCents);
    assert.equal(after.leftoverCents, before.leftoverCents);
    assert.equal(after.payments[0].amountCents, before.payments[0].amountCents);
  });

  it("keeps commas, quotes, and a Friday week start", () => {
    const restored = csvToState(stateToCsv({
      weekStartsOn: 5,
      cards: [{ id: "c1", name: "Store, Card", dueDay: 3 }],
      bills: [{ id: "b1", name: "Rent \"main\"", amount: 1200.5, dueDate: "2026-11-03", frequency: "monthly", payFrom: "c1" }],
      incomes: [{ id: "i1", name: "Side gig", amount: 80, date: "2026-10-24", frequency: "once" }],
    }));
    assert.equal(restored.weekStartsOn, 5);
    assert.equal(restored.cards[0].name, "Store, Card");
    assert.equal(restored.cards[0].dueDay, 3);
    assert.equal(restored.bills[0].name, "Rent \"main\"");
    assert.equal(restored.bills[0].amount, 1200.5);
    assert.equal(restored.bills[0].payFrom, restored.cards[0].id);
    assert.equal(restored.incomes[0].frequency, "once");
  });

  it("accepts spreadsheet dates, dollar signs, and bi-weekly wording", () => {
    const restored = csvToState([
      "type,name,amount,date,frequency,paid_from,card_due_day,week_starts",
      "card,Amex,,,,,12,",
      "bill,Gym,\"$40.00\",11/8/2026,Bi-weekly,Amex,,",
      "income,Bonus,\"$1,000.00\",10/24/2026,one-time,,,",
      "settings,,,,,,,Friday",
    ].join("\n"));
    assert.equal(restored.weekStartsOn, 5);
    assert.equal(restored.cards[0].dueDay, 12);
    assert.equal(restored.bills[0].amount, 40);
    assert.equal(restored.bills[0].dueDate, "2026-11-08");
    assert.equal(restored.bills[0].frequency, "biweekly");
    assert.equal(restored.bills[0].payFrom, restored.cards[0].id);
    assert.equal(restored.incomes[0].amount, 1000);
    assert.equal(restored.incomes[0].date, "2026-10-24");
    assert.equal(restored.incomes[0].frequency, "once");
  });

  it("rejects a bill paid from a card that is not in the file", () => {
    assert.throws(
      () => csvToState([
        "type,name,amount,date,frequency,paid_from,card_due_day,week_starts",
        "bill,Phone,45.00,2026-10-28,monthly,Amex,,",
      ].join("\n")),
      /Amex/,
    );
  });

  it("rejects a file without replacing anything when a row is invalid", () => {
    assert.throws(
      () => csvToState([
        "type,name,amount,date,frequency,paid_from,card_due_day,week_starts",
        "bill,Electric,0,2026-11-01,yearly,checking,,",
      ].join("\n")),
      /Electric/,
    );
  });
});
