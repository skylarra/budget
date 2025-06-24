import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { formatDate } from './expenseUtil.js';


const Transactions = () => {
    const [expenses, setExpenses] = useState([]);
    const [selectedExpense, setSelectedExpense] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    // fetch transactions from the server
    const fetchTransactions = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:5000/transactions", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setTransactions(response.data);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            if (error.response) {
                console.error("Server responded with:", error.response.data);
            }
        }
    }, [token]);  

    // fetch expenses from the server
    const fetchExpenses = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:5000/expenses", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setExpenses(response.data);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchTransactions();
        fetchExpenses();
    }, [fetchTransactions, fetchExpenses]);    

    useEffect(() => {
        console.log("Fetched Transactions:", transactions);
        console.log("Fetched Expenses:", expenses);
    }, [transactions, expenses]);

// add a new transaction

const addTransaction = async (e) => {
    e.preventDefault();

    if (!selectedExpense || !amount || !date ) { 
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await axios.post(
            "http://localhost:5000/transactions",
            { expense_id: selectedExpense, amount, date },
            { headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

            setTransactions((prevTransactions) => [...prevTransactions, response.data]);
            
            setSelectedExpense("");
            setAmount("");
            setDate("");
            await fetchTransactions();
    } catch (error) {
        console.error("Error adding transaction:", error);
    }}

// delete an expense

    const deleteTransaction = async (id) => {
        try {
            const response = await axios.delete(`http://localhost:5000/transactions/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 204) {
                setTransactions((prevTransactions) => prevTransactions.filter((transaction) => transaction.id !== id));
            } else {
                console.error("Error deleting transaction:", response.statusText);
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
        }};
    
      const [showForm, setShowForm] = useState(false);
    
      return (
        <div className="bills-container">
            <div className='bills-header'>
                <h2 className='tac'>Your Transactions</h2>
                <button className="open-form-btn" onClick={() => setShowForm(true)}>+ Add Transaction</button>
            </div>
            <div className='bill-section'>
            {loading ? (
                <p className='tac'>Loading...</p>
            ) : (
                <>
                    {transactions.map((transaction) => {

                        return (
                            <div className='Bill' key={transaction.id}>
                                <div className='dateFormat tac'>
                                    <p className='bold'>{formatDate(transaction.date).dayOfWeek}</p>
                                    <h3 className='bold number'>{formatDate(transaction.date).day}</h3>
                                    <p className='bold'>{formatDate(transaction.date).month} {formatDate(transaction.date).year}</p>
                                </div>
                                <div className='Bill-name'>
                                    <h2>
                                        {
                                            expenses.find(exp => exp.id === transaction.expense_id)?.category || "Unknown"
                                        }
                                    </h2>
                                </div>
                                <div className='Bill-amount'>
                                <p>${parseFloat(transaction.amount).toFixed(2)}</p>
                                </div>
                                <button className="Bill-delete" onClick={() => deleteTransaction(transaction.id)}>X</button>
                            </div>
                        );
                    })}
                </>
            )}
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-btn" onClick={() => setShowForm(false)}>✖</button>
                        <form onSubmit={addTransaction} className="add-bill-form">
                        <select
                            value={selectedExpense}
                            onChange={(e) => setSelectedExpense(e.target.value)}
                            required
                        >
                            <option value="">Select Category</option>
                            {expenses.map((expense) => (
                                <option key={expense.id} value={expense.id}>
                                    {expense.category}
                                </option>
                            ))}
                        </select>
                            <input
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                            <input
                                type="date"
                                placeholder="Date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                            <button type="submit">Add Transaction</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;