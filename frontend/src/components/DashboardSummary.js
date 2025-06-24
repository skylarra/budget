import React from "react";
import { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import { formatDate } from "./expenseUtil";

// this is the summary of the week, it shows the bills and income for the next 7 days

const Upcoming = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSummary = async () => {
        try {
            const res = await axios.get("http://localhost:5000/dashboard/weeksummary", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setSummary(res.data.activity);
        } catch (error) {
            console.error("Error fetching summary:", error);
        }finally {
            setLoading(false);
        };
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    

    return (
            <div className='bill-section'>
            {loading ? (
                <p className='tac'>Loading...</p>
            ) : (
                <>
                    {summary.map((item, i) => {
                        const type = item.type === "income" ? "Income" : "Bill";
                        return (
                            <div className={type} key={i}>
                                <div className='dateFormat tac'>
                                    <p className='bold'>{formatDate(item.date).dayOfWeek}</p>
                                    <h3 className='bold number'>{formatDate(item.date).day}</h3>
                                    <p className='bold'>{formatDate(item.date).month}</p>
                                </div>
                                <div className='Bill-name'>
                                    <h2>{item.name}</h2>
                                </div>
                                <div className='Bill-amount'>
                                <p>${parseFloat(item.amount).toFixed(2)}</p>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
            </div>

            
    );
};

const SummaryExpenses = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSummary = async () => {
        try {
            const res = await axios.get("http://localhost:5000/expensesummary", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setSummary(res.data.activity);
        } catch (error) {
            console.error("Error fetching summary:", error);
        }finally {
            setLoading(false);
        };
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    return (
        <div className='bill-section'>
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
                                            <p>Remaining ${parseFloat(item.amount_remaining).toFixed(2)}</p>
                                        </div>
                                </summary>
                                <div className="expense-details">
                                    <p className="bold">Total Budget: ${parseFloat(item.amount).toFixed(2)}</p>
                                    <p className="bold">Spent: ${parseFloat(item.amount_used).toFixed(2)}</p>
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
                                                <p>${parseFloat(transaction.amount).toFixed(2)}</p>
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
        </div>
    );
};

export {Upcoming, SummaryExpenses};