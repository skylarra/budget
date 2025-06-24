import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import { useCallback } from 'react';
import {WeekAmt} from './expenseUtil.js';
import { formatDate, MoneyFormatter } from './expenseUtil.js';

const Expenses = () => {
    const [summary, setSummary] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [category, setCategory] = useState("");
    const [amount_4_weeks, setAmount_4_weeks] = useState("");
    const [amount_5_weeks, setAmount_5_weeks] = useState("");
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    // fetch bills from the server
    const fetchExpenses = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:5000/monthlyexpense", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setSummary(response.data.activity);
            console.log("Fetched expenses"); // ✅ keep this
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

// add a new expense

const addExpense = async (e) => {
    e.preventDefault();

    if (!category || !amount_4_weeks || !amount_5_weeks) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await axios.post(
            "http://localhost:5000/expenses",
            { category, amount_4_weeks, amount_5_weeks },
            { headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

            setExpenses((prevbills) => [...prevbills, response.data]);
            setCategory("");
            setAmount_4_weeks("");
            setAmount_5_weeks("");
    } catch (error) {
        console.error("Error adding expense:", error);
    }}

// delete an expense

    const deleteExpense = async (id) => {
        try {
            const response = await axios.delete(`http://localhost:5000/expenses/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 204) {
                setExpenses((prevExpenses) => prevExpenses.filter((expense) => expense.id !== id));
            } else {
                console.error("Error deleting expense:", response.statusText);
            }
        } catch (error) {
            console.error("Error deleting expense:", error);
        }};


    // how many Fridays are in the current month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed, so April is 3

    const fridays = WeekAmt(year, month);
    console.log(`Fridays this month: ${fridays}`);

    const fourWeeks = fridays === 4 ? true : false;
    const fiveWeeks = fridays === 5 ? true : false;

    const amtWeeks = fourWeeks ? 4 : fiveWeeks ? 5 : 'Error';

    console.log(`Weeks this month: ${amtWeeks}`);
    
      const [showForm, setShowForm] = useState(false);
      console.log(expenses.length)
    
      return (
        <div className='bill-section'>
            <div className='bills-header'>
                <h2 className='tac'>Your Expenses</h2>
                <button className="open-form-btn" onClick={() => setShowForm(true)}>+ Add Expense</button>
            </div>
            {loading ? (
                <p className='tac'>Loading...</p>
            ) : (
                <>
                    {summary.map((item, i) => {
                        return (
                            <div className="Bill" key={i}>
                            <details>
                                <summary>
                                        <span className="triangle">▶</span>
                                        <div className='Bill-name'>
                                            <h2>{item.category}</h2>
                                        </div>
                                        <div className='Bill-amount'>
                                            <p>Remaining {MoneyFormatter(parseFloat(item.amount_remaining))}</p>
                                        </div>
                                        <button className="Bill-delete" onClick={() => deleteExpense(item.id)}>X</button>
                                </summary>
                                <div className="expense-details">
                                    <p className="bold">Total Budget: {MoneyFormatter(parseFloat(item.amount))}</p>
                                    <p className="bold">Spent: {MoneyFormatter(parseFloat(item.amount_used))}</p>
                                </div>
                                <p className="transaction-header">Transactions:</p>
                                <div className="transaction-details">
                                    {item.transactions.length > 0 ? (
                                    item.transactions.map((transaction, j) => (
                                        <div className="transaction" key={j}>
                                            <div className='transaction-dateFormat'>
                                                <p className='bold'>{formatDate(transaction.date).dayOfWeek},</p>
                                                <p className='bold'>{formatDate(transaction.date).month}</p>
                                                <h3 className='bold'>{formatDate(transaction.date).day}</h3>
                                            </div>
                                            <div className='Bill-name'>
                                                <h2>{transaction.category}</h2>
                                            </div>
                                            <div className='Bill-amount'>
                                                <p>{MoneyFormatter(parseFloat(transaction.amount))}</p>
                                            </div>
                                        </div>
                                ))
                            ) : (
                                <p className="no-transactions">No transactions yet</p>
                            )}
                        </div>
                            </details>
                            </div>
                        );
                    })}
                </>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-btn" onClick={() => setShowForm(false)}>✖</button>
                        <form onSubmit={addExpense} className="add-bill-form">
                            <input
                                type="text"
                                placeholder="Expense Category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Amount for a 4 week month"
                                value={amount_4_weeks}
                                onChange={(e) => setAmount_4_weeks(e.target.value)}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Amount for a 5 week month"
                                value={amount_5_weeks}
                                onChange={(e) => setAmount_5_weeks(e.target.value)}
                                required
                            />
                            <button type="submit">Add Expense</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;