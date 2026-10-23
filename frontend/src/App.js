import { useEffect, useMemo, useState } from "react";
import {
  buildPlan,
  cardSchedule,
  emptyState,
  exampleState,
  formatMoney,
  loadState,
  toCents,
  nextOnOrAfter,
  parseISO,
  saveState,
} from "./planner";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BILL_FREQUENCIES = [
  ["weekly", "Weekly"],
  ["biweekly", "Biweekly"],
  ["monthly", "Monthly"],
];

const INCOME_FREQUENCIES = [
  ...BILL_FREQUENCIES,
  ["once", "One-time"],
];

const FREQUENCY_LABEL = Object.fromEntries([...INCOME_FREQUENCIES]);

const BLANK_BILL = { name: "", amount: "", dueDate: "", frequency: "monthly", payFrom: "checking" };
const BLANK_INCOME = { name: "", amount: "", date: "", frequency: "weekly" };
const BLANK_CARD = { name: "", dueDay: "" };

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

function payFromName(state, payFrom) {
  if (!payFrom || payFrom === "checking") return "Checking";
  const card = state.cards.find((item) => item.id === payFrom);
  return card ? card.name : "Checking";
}

function leftoverNote(week) {
  if (week.incomeCents === 0 && week.setAsideCents === 0) {
    return "Nothing is scheduled this week.";
  }
  if (week.incomeCents === 0) {
    return "No paycheck this week. Move the set-aside from money already in the account.";
  }
  if (week.leftoverCents < 0) {
    return `This paycheck is short ${formatMoney(Math.abs(week.leftoverCents))}. Cover that from an earlier week's leftover.`;
  }
  return "Leftover is this week's income minus the set-aside. Spend or save it. Paying a bill later uses the set-aside, not this leftover.";
}

function reserveDetail(row) {
  const weeks = `${row.weeksElapsed} of ${row.weekCount} weeks`;
  if (row.status === "ready") {
    return `Saved · ${weeks} · ${row.payFromLabel} pays ${formatDay(row.cashDate)}`;
  }
  if (row.status === "due") {
    const where = row.payFrom === "checking"
      ? `leaves checking ${formatDay(row.dueDate)}`
      : `${row.payFromLabel} pays ${formatDay(row.cashDate)}`;
    return `Due this week · ${weeks} · ${where}`;
  }
  const where = row.payFrom === "checking"
    ? "Checking"
    : `${row.payFromLabel} pays ${formatDay(row.cashDate)}`;
  return `${weeks} · ${formatMoney(row.reservedCents)} of ${formatMoney(row.amountCents)} · due ${formatDay(row.dueDate)} · ${where}`;
}

function App() {
  const [state, setState] = useState(loadState);
  const [weekCount, setWeekCount] = useState(8);
  const [selected, setSelected] = useState(0);
  const [billForm, setBillForm] = useState(BLANK_BILL);
  const [incomeForm, setIncomeForm] = useState(BLANK_INCOME);
  const [cardForm, setCardForm] = useState(BLANK_CARD);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const plan = useMemo(() => buildPlan(state, { weekCount }), [state, weekCount]);
  const selectedIndex = Math.min(selected, plan.weeks.length - 1);
  const week = plan.weeks[selectedIndex];
  const cardsDue = cardSchedule(plan);
  const hasEntries = state.bills.length + state.incomes.length + state.cards.length > 0;

  function updateWeekStart(value) {
    setState((current) => ({ ...current, weekStartsOn: Number(value) }));
  }

  function saveBill(event) {
    event.preventDefault();
    const amount = parseAmount(billForm.amount);
    if (!billForm.name.trim() || amount == null || !billForm.dueDate) {
      setFormError("Enter a name, an amount, and a due date for the bill.");
      return;
    }
    const next = {
      id: editing && editing.type === "bill" ? editing.id : uid(),
      name: billForm.name.trim(),
      amount,
      dueDate: billForm.dueDate,
      frequency: billForm.frequency,
      payFrom: billForm.payFrom || "checking",
    };
    setState((current) => ({
      ...current,
      bills: editing && editing.type === "bill"
        ? current.bills.map((bill) => (bill.id === next.id ? next : bill))
        : [...current.bills, next],
    }));
    setBillForm(BLANK_BILL);
    setEditing(null);
    setFormError("");
  }

  function saveIncome(event) {
    event.preventDefault();
    const amount = parseAmount(incomeForm.amount);
    if (!incomeForm.name.trim() || amount == null || !incomeForm.date) {
      setFormError("Enter a name, an amount, and a date for the income.");
      return;
    }
    const next = {
      id: editing && editing.type === "income" ? editing.id : uid(),
      name: incomeForm.name.trim(),
      amount,
      date: incomeForm.date,
      frequency: incomeForm.frequency,
    };
    setState((current) => ({
      ...current,
      incomes: editing && editing.type === "income"
        ? current.incomes.map((income) => (income.id === next.id ? next : income))
        : [...current.incomes, next],
    }));
    setIncomeForm(BLANK_INCOME);
    setEditing(null);
    setFormError("");
  }

  function saveCard(event) {
    event.preventDefault();
    const dueDay = Number(cardForm.dueDay);
    if (!cardForm.name.trim() || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setFormError("Enter a card name and the day of the month the card is paid, from 1 to 31.");
      return;
    }
    const next = {
      id: editing && editing.type === "card" ? editing.id : uid(),
      name: cardForm.name.trim(),
      dueDay,
    };
    setState((current) => ({
      ...current,
      cards: editing && editing.type === "card"
        ? current.cards.map((card) => (card.id === next.id ? next : card))
        : [...current.cards, next],
    }));
    setCardForm(BLANK_CARD);
    setEditing(null);
    setFormError("");
  }

  function editBill(bill) {
    setEditing({ type: "bill", id: bill.id });
    setBillForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDate: bill.dueDate,
      frequency: bill.frequency,
      payFrom: state.cards.some((card) => card.id === bill.payFrom) ? bill.payFrom : "checking",
    });
    setFormError("");
  }

  function editIncome(income) {
    setEditing({ type: "income", id: income.id });
    setIncomeForm({
      name: income.name,
      amount: String(income.amount),
      date: income.date,
      frequency: income.frequency,
    });
    setFormError("");
  }

  function editCard(card) {
    setEditing({ type: "card", id: card.id });
    setCardForm({ name: card.name, dueDay: String(card.dueDay) });
    setFormError("");
  }

  function cancelEdit() {
    if (editing && editing.type === "bill") setBillForm(BLANK_BILL);
    if (editing && editing.type === "income") setIncomeForm(BLANK_INCOME);
    if (editing && editing.type === "card") setCardForm(BLANK_CARD);
    setEditing(null);
    setFormError("");
  }

  function deleteBill(id) {
    setState((current) => ({ ...current, bills: current.bills.filter((bill) => bill.id !== id) }));
    if (editing && editing.type === "bill" && editing.id === id) cancelEdit();
  }

  function deleteIncome(id) {
    setState((current) => ({ ...current, incomes: current.incomes.filter((income) => income.id !== id) }));
    if (editing && editing.type === "income" && editing.id === id) cancelEdit();
  }

  function deleteCard(id) {
    setState((current) => ({
      ...current,
      cards: current.cards.filter((card) => card.id !== id),
      bills: current.bills.map((bill) => (bill.payFrom === id ? { ...bill, payFrom: "checking" } : bill)),
    }));
    if (editing && editing.type === "card" && editing.id === id) cancelEdit();
  }

  function loadExample() {
    if (hasEntries && !window.confirm("Replace your current bills, income, and cards with the example?")) return;
    setState(exampleState(new Date()));
    setSelected(0);
    setEditing(null);
    setBillForm(BLANK_BILL);
    setIncomeForm(BLANK_INCOME);
    setCardForm(BLANK_CARD);
    setFormError("");
  }

  function clearAll() {
    if (!hasEntries) return;
    if (!window.confirm("Remove all bills, income, and cards stored in this browser?")) return;
    setState(emptyState());
    setSelected(0);
    setEditing(null);
    setBillForm(BLANK_BILL);
    setIncomeForm(BLANK_INCOME);
    setCardForm(BLANK_CARD);
    setFormError("");
  }

  const bills = [...state.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
  const incomes = [...state.incomes].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Weekly paycheck plan</p>
          <h1>What to set aside, what to keep, what is left</h1>
          <p className="lede">
            Each bill is split across the weeks between its due dates. One slice comes out of each paycheck.
            A bill due sooner has more weeks already counted, so the account should be holding more of it.
          </p>
        </div>
        <div className="top-actions">
          <button type="button" className="button secondary" onClick={loadExample}>Load example</button>
          <button type="button" className="button ghost" onClick={clearAll} disabled={!hasEntries}>Clear</button>
        </div>
      </header>

      <div className={hasEntries ? "layout has-data" : "layout"}>
        <main className="plan">
          <div className="plan-heading">
            <div>
              <p className="eyebrow">{selectedIndex === 0 ? "This week" : "Selected week"}</p>
              <h2>{formatRange(week.start, week.end)}</h2>
            </div>
            <label className="inline-field">
              Weeks shown
              <select value={weekCount} onChange={(event) => setWeekCount(Number(event.target.value))}>
                <option value={8}>8</option>
                <option value={12}>12</option>
              </select>
            </label>
          </div>

          <div className="metrics" aria-live="polite">
            <p>
              <span>Subtract from this paycheck</span>
              <strong>{formatMoney(week.setAsideCents)}</strong>
            </p>
            <p>
              <span>Keep in the account</span>
              <strong>{formatMoney(week.reserveCents)}</strong>
            </p>
            <p className={week.leftoverCents < 0 ? "is-negative" : "is-primary"}>
              <span>Left for expenses and savings</span>
              <strong>{formatMoney(week.leftoverCents)}</strong>
            </p>
          </div>
          <p className="note">{leftoverNote(week)}</p>

          <section>
            <h3>Income this week</h3>
            {week.incomes.length === 0 ? (
              <p className="empty">No income this week.</p>
            ) : (
              <ul className="lines">
                {week.incomes.map((income) => (
                  <li key={`${income.id}-${income.date}`}>
                    <div>
                      <b>{income.name}</b>
                      <small>{FREQUENCY_LABEL[income.frequency] || income.frequency} · {formatDay(income.date)}</small>
                    </div>
                    <span className="money in">{formatMoney(income.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Subtract from the paycheck</h3>
            {week.setAsides.length === 0 ? (
              <p className="empty">No bill slices fall in this week.</p>
            ) : (
              <ul className="lines">
                {week.setAsides.map((row) => (
                  <li key={row.key}>
                    <div>
                      <b>{row.name}</b>
                      <small>Week {row.weekIndex} of {row.weekCount} · due {formatDay(row.dueDate)} · {row.payFromLabel}</small>
                    </div>
                    <span className="money out">{formatMoney(row.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Keep in the account</h3>
            {week.reserves.length === 0 ? (
              <p className="empty">Nothing needs to be held for bills this week.</p>
            ) : (
              <ul className="lines">
                {week.reserves.map((row) => (
                  <li key={row.key}>
                    <div>
                      <b>{row.name}</b>
                      <small>{reserveDetail(row)}</small>
                    </div>
                    <span className="money">{formatMoney(row.reservedCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Comes out of the account</h3>
            {week.payments.length === 0 ? (
              <p className="empty">Nothing is due out of the account this week.</p>
            ) : (
              <ul className="lines">
                {week.payments.map((payment) => (
                  <li key={payment.key}>
                    <div>
                      <b>{payment.kind === "card" ? `Pay ${payment.name}` : payment.name}</b>
                      <small>
                        {formatDay(payment.date)}
                        {payment.kind === "card"
                          ? ` · ${payment.charges.map((charge) => `${charge.name} charged ${formatDay(charge.date)}`).join(", ")}`
                          : " · Checking"}
                      </small>
                    </div>
                    <span className="money out">{formatMoney(payment.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Every week</h3>
            <div className="week-scroll">
              <div className="week-head">
                <span>Week</span>
                <span>Income</span>
                <span>Set aside</span>
                <span>Left</span>
                <span>In account</span>
              </div>
              {plan.weeks.map((item, index) => (
                <button
                  key={item.start}
                  type="button"
                  className={index === selectedIndex ? "week-row is-selected" : "week-row"}
                  aria-pressed={index === selectedIndex}
                  onClick={() => setSelected(index)}
                >
                  <span>
                    {formatRange(item.start, item.end)}
                    {index === 0 ? <em>This week</em> : null}
                  </span>
                  <span>{formatMoney(item.incomeCents)}</span>
                  <span>{formatMoney(item.setAsideCents)}</span>
                  <span className={item.leftoverCents < 0 ? "negative" : ""}>{formatMoney(item.leftoverCents)}</span>
                  <span>{formatMoney(item.reserveCents)}</span>
                </button>
              ))}
            </div>
          </section>

          {cardsDue.length > 0 ? (
            <section>
              <h3>Card payments</h3>
              <ul className="lines">
                {cardsDue.map((payment) => (
                  <li key={payment.key}>
                    <div>
                      <b>{payment.name}</b>
                      <small>
                        Pay {formatDay(payment.date)}
                        {" · "}
                        {payment.charges.map((charge) => `${charge.name} ${formatMoney(charge.amountCents)} charged ${formatDay(charge.date)}`).join(", ")}
                      </small>
                    </div>
                    <span className="money out">{formatMoney(payment.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>

        <aside className="editors">
          {formError ? <p className="form-error" role="alert">{formError}</p> : null}

          <section>
            <h2>Bills</h2>
            <form onSubmit={saveBill}>
              <label>
                Name
                <input value={billForm.name} onChange={(event) => setBillForm({ ...billForm, name: event.target.value })} />
              </label>
              <label>
                Amount
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={billForm.amount} onChange={(event) => setBillForm({ ...billForm, amount: event.target.value })} />
              </label>
              <label>
                Due date
                <input type="date" value={billForm.dueDate} onChange={(event) => setBillForm({ ...billForm, dueDate: event.target.value })} />
              </label>
              <p className="field-help">
                {billForm.frequency === "monthly" && "Repeats on this day each month."}
                {billForm.frequency === "biweekly" && "Repeats every 14 days from this date."}
                {billForm.frequency === "weekly" && "Repeats every 7 days from this date."}
              </p>
              <label>
                How often
                <select value={billForm.frequency} onChange={(event) => setBillForm({ ...billForm, frequency: event.target.value })}>
                  {BILL_FREQUENCIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                Paid from
                <select value={billForm.payFrom} onChange={(event) => setBillForm({ ...billForm, payFrom: event.target.value })}>
                  <option value="checking">Checking</option>
                  {state.cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
              </label>
              <p className="field-help">Checking pays the bill on the due date. A card is charged then, and you pay the card on the card’s due day.</p>
              <div className="form-actions">
                <button type="submit" className="button">{editing && editing.type === "bill" ? "Save bill" : "Add bill"}</button>
                {editing && editing.type === "bill" ? <button type="button" className="button ghost" onClick={cancelEdit}>Cancel</button> : null}
              </div>
            </form>
            <ul className="saved">
              {bills.map((bill) => (
                <li key={bill.id}>
                  <div>
                    <b>{bill.name}</b>
                    <small>
                      {formatMoney(toCents(bill.amount))} · {FREQUENCY_LABEL[bill.frequency]} · next {formatDay(nextOnOrAfter(bill.dueDate, bill.frequency))} · {payFromName(state, bill.payFrom)}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => editBill(bill)}>Edit</button>
                    <button type="button" onClick={() => deleteBill(bill.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Income</h2>
            <form onSubmit={saveIncome}>
              <label>
                Name
                <input value={incomeForm.name} onChange={(event) => setIncomeForm({ ...incomeForm, name: event.target.value })} />
              </label>
              <label>
                Amount
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={incomeForm.amount} onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })} />
              </label>
              <label>
                {incomeForm.frequency === "once" ? "Date" : "A pay date"}
                <input type="date" value={incomeForm.date} onChange={(event) => setIncomeForm({ ...incomeForm, date: event.target.value })} />
              </label>
              <p className="field-help">
                {incomeForm.frequency === "once" && "Arrives only on this date."}
                {incomeForm.frequency === "monthly" && "Repeats on this day each month."}
                {incomeForm.frequency === "biweekly" && "Repeats every 14 days from this date."}
                {incomeForm.frequency === "weekly" && "Repeats every 7 days from this date."}
              </p>
              <label>
                How often
                <select value={incomeForm.frequency} onChange={(event) => setIncomeForm({ ...incomeForm, frequency: event.target.value })}>
                  {INCOME_FREQUENCIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <div className="form-actions">
                <button type="submit" className="button">{editing && editing.type === "income" ? "Save income" : "Add income"}</button>
                {editing && editing.type === "income" ? <button type="button" className="button ghost" onClick={cancelEdit}>Cancel</button> : null}
              </div>
            </form>
            <ul className="saved">
              {incomes.map((income) => (
                <li key={income.id}>
                  <div>
                    <b>{income.name}</b>
                    <small>
                      {formatMoney(toCents(income.amount))} · {FREQUENCY_LABEL[income.frequency]} · {formatDay(income.frequency === "once" ? income.date : nextOnOrAfter(income.date, income.frequency))}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => editIncome(income)}>Edit</button>
                    <button type="button" onClick={() => deleteIncome(income.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Credit cards</h2>
            <form onSubmit={saveCard}>
              <label>
                Name
                <input value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} />
              </label>
              <label>
                Payment due day
                <input type="number" min="1" max="31" step="1" value={cardForm.dueDay} onChange={(event) => setCardForm({ ...cardForm, dueDay: event.target.value })} />
              </label>
              <p className="field-help">The day of the month you pay this card. Charges since the last payment are added together.</p>
              <div className="form-actions">
                <button type="submit" className="button">{editing && editing.type === "card" ? "Save card" : "Add card"}</button>
                {editing && editing.type === "card" ? <button type="button" className="button ghost" onClick={cancelEdit}>Cancel</button> : null}
              </div>
            </form>
            <ul className="saved">
              {state.cards.map((card) => (
                <li key={card.id}>
                  <div>
                    <b>{card.name}</b>
                    <small>Pay on day {card.dueDay} of each month</small>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => editCard(card)}>Edit</button>
                    <button type="button" onClick={() => deleteCard(card.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Week starts</h2>
            <label>
              First day of your week
              <select value={state.weekStartsOn} onChange={(event) => updateWeekStart(event.target.value)}>
                {WEEKDAYS.map((name, index) => <option key={name} value={index}>{name}</option>)}
              </select>
            </label>
            <p className="field-help">A new slice is counted when this day arrives. Set it to your payday if you plan paycheck to paycheck.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
