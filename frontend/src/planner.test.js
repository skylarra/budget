import { buildPlan, cardSchedule, exampleState, splitCents, toCents, weekStartsAfterThrough } from "./planner";

function on(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
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
  test("splits cents so the slices add up to the bill", () => {
    expect(splitCents(1001, 3)).toEqual([334, 334, 333]);
    expect(splitCents(toCents(120), 4).reduce((sum, part) => sum + part, 0)).toBe(12000);
  });

  test("counts Mondays after the previous due date through the next one", () => {
    const weeks = weekStartsAfterThrough(on("2026-10-01"), on("2026-11-01"), 1).map((date) => date.getDate());
    expect(weeks).toEqual([5, 12, 19, 26]);
    const gym = weekStartsAfterThrough(on("2026-10-08"), on("2026-11-08"), 1).map((date) => date.getDate());
    expect(gym).toEqual([12, 19, 26, 2]);
  });

  test("keeps 3 weeks of electric and 2 weeks of gym on October 22", () => {
    const plan = buildPlan(octoberPlanInput, { startDate: on("2026-10-22"), weekCount: 8 });
    const week = plan.weeks[0];

    expect(week.start).toBe("2026-10-19");
    expect(week.end).toBe("2026-10-25");

    const electric = week.reserves.find((row) => row.name === "Electric");
    const gym = week.reserves.find((row) => row.name === "Gym");
    expect(electric).toMatchObject({ weeksElapsed: 3, weekCount: 4, reservedCents: 9000, status: "saving", dueDate: "2026-11-01" });
    expect(gym).toMatchObject({ weeksElapsed: 2, weekCount: 4, reservedCents: 2000, status: "saving", dueDate: "2026-11-08" });

    expect(week.setAsides.find((row) => row.name === "Electric")).toMatchObject({ amountCents: 3000, weekIndex: 3, weekCount: 4 });
    expect(week.setAsides.find((row) => row.name === "Gym")).toMatchObject({ amountCents: 1000, weekIndex: 2, weekCount: 4 });

    const netflixReady = week.reserves.find((row) => row.name === "Netflix" && row.status === "ready");
    const netflixSaving = week.reserves.find((row) => row.name === "Netflix" && row.status === "saving");
    expect(netflixReady).toMatchObject({ reservedCents: 1599, cashDate: "2026-10-25", dueDate: "2026-10-18" });
    expect(netflixSaving).toMatchObject({
      weeksElapsed: 1,
      weekCount: 5,
      reservedCents: 320,
      dueDate: "2026-11-18",
      cashDate: "2026-11-25",
    });

    expect(week.setAsideCents).toBe(4320);
    expect(week.incomeCents).toBe(100000);
    expect(week.leftoverCents).toBe(95680);
    expect(week.reserveCents).toBe(12919);

    expect(week.payments).toEqual([
      expect.objectContaining({
        kind: "card",
        name: "Visa",
        date: "2026-10-25",
        amountCents: 1599,
        charges: [expect.objectContaining({ name: "Netflix", amountCents: 1599, date: "2026-10-18" })],
      }),
    ]);
  });

  test("the October 22 example matches that week count", () => {
    const plan = buildPlan(exampleState(on("2026-10-22")), { startDate: on("2026-10-22") });
    const week = plan.weeks[0];
    expect(week.reserves.find((row) => row.name === "Electric").weeksElapsed).toBe(3);
    expect(week.reserves.find((row) => row.name === "Gym").weeksElapsed).toBe(2);
  });

  test("pays the full electric bill the week it is due, then starts the next cycle", () => {
    const plan = buildPlan(octoberPlanInput, { startDate: on("2026-10-22"), weekCount: 4 });
    const dueWeek = plan.weeks[1];
    expect(dueWeek.start).toBe("2026-10-26");
    expect(dueWeek.reserves.find((row) => row.name === "Electric")).toMatchObject({
      status: "due",
      reservedCents: 12000,
      weeksElapsed: 4,
    });
    expect(dueWeek.payments).toEqual([
      expect.objectContaining({ kind: "bill", name: "Electric", amountCents: 12000, date: "2026-11-01" }),
    ]);
    expect(dueWeek.reserves.find((row) => row.name === "Gym")).toMatchObject({ weeksElapsed: 3, reservedCents: 3000 });

    const following = plan.weeks[2];
    expect(following.start).toBe("2026-11-02");
    expect(following.reserves.find((row) => row.name === "Electric" && row.dueDate === "2026-11-01")).toBeUndefined();
    expect(following.reserves.find((row) => row.name === "Electric")).toMatchObject({
      status: "saving",
      dueDate: "2026-12-01",
      weeksElapsed: 1,
      weekCount: 5,
      reservedCents: 2400,
    });
    expect(following.reserves.find((row) => row.name === "Netflix" && row.status === "ready")).toBeUndefined();
  });

  test("groups every charge on a card into the card payment", () => {
    const plan = buildPlan({
      ...octoberPlanInput,
      bills: [
        ...octoberPlanInput.bills,
        { id: "phone", name: "Phone", amount: 45, dueDate: "2026-10-20", frequency: "monthly", payFrom: "visa" },
      ],
    }, { startDate: on("2026-10-22"), weekCount: 2 });

    const visa = plan.weeks[0].payments.find((payment) => payment.kind === "card");
    expect(visa.amountCents).toBe(1599 + 4500);
    expect(visa.charges.map((charge) => charge.name)).toEqual(["Netflix", "Phone"]);
    expect(cardSchedule(plan).map((payment) => payment.amountCents)).toContain(6099);
  });

  test("a weekly bill is set aside in full the week it is due", () => {
    const plan = buildPlan({
      weekStartsOn: 1,
      cards: [],
      bills: [
        { id: "bus", name: "Bus", amount: 25, dueDate: "2026-10-23", frequency: "weekly", payFrom: "checking" },
      ],
      incomes: [],
    }, { startDate: on("2026-10-22"), weekCount: 2 });

    expect(plan.weeks[0].setAsides[0]).toMatchObject({ amountCents: 2500, weekIndex: 1, weekCount: 1 });
    expect(plan.weeks[0].reserves[0]).toMatchObject({ reservedCents: 2500, status: "due" });
    expect(plan.weeks[0].payments[0]).toMatchObject({ name: "Bus", amountCents: 2500, date: "2026-10-23" });
    expect(plan.weeks[0].leftoverCents).toBe(-2500);
  });

  test("biweekly and one-time income land only on their weeks", () => {
    const plan = buildPlan({
      weekStartsOn: 1,
      cards: [],
      bills: [
        { id: "gym", name: "Gym", amount: 40, dueDate: "2026-11-08", frequency: "biweekly", payFrom: "checking" },
      ],
      incomes: [
        { id: "job", name: "Job", amount: 2000, date: "2026-10-23", frequency: "biweekly" },
        { id: "bonus", name: "Bonus", amount: 100, date: "2026-10-24", frequency: "once" },
        { id: "rent-help", name: "Help", amount: 50, date: "2026-11-01", frequency: "monthly" },
      ],
    }, { startDate: on("2026-10-22"), weekCount: 4 });

    expect(plan.weeks[0].incomes.map((income) => income.name)).toEqual(["Job", "Bonus"]);
    expect(plan.weeks[0].incomeCents).toBe(210000);
    expect(plan.weeks[1].incomes.map((income) => income.name)).toEqual(["Help"]);
    expect(plan.weeks[1].incomeCents).toBe(5000);
    expect(plan.weeks[2].incomes.map((income) => income.name)).toEqual(["Job"]);
    expect(plan.weeks[3].incomeCents).toBe(0);

    const gym = plan.weeks[0].reserves.find((row) => row.name === "Gym");
    expect(gym).toMatchObject({
      status: "due",
      dueDate: "2026-10-25",
      weekCount: 2,
      weeksElapsed: 2,
      reservedCents: 4000,
    });
    expect(plan.weeks[0].setAsides.find((row) => row.name === "Gym")).toMatchObject({
      amountCents: 2000,
      weekIndex: 2,
      weekCount: 2,
    });
    expect(plan.weeks[1].reserves.find((row) => row.name === "Gym")).toMatchObject({
      status: "saving",
      dueDate: "2026-11-08",
      weeksElapsed: 1,
      weekCount: 2,
      reservedCents: 2000,
    });
  });

  test("a missing card is treated as checking", () => {
    const plan = buildPlan({
      weekStartsOn: 1,
      cards: [],
      bills: [
        { id: "netflix", name: "Netflix", amount: 16, dueDate: "2026-11-18", frequency: "monthly", payFrom: "visa" },
      ],
      incomes: [],
    }, { startDate: on("2026-10-22"), weekCount: 1 });

    expect(plan.weeks[0].reserves.every((row) => row.payFromLabel === "Checking")).toBe(true);
  });
});
