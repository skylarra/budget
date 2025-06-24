import { useState, useEffect } from 'react';
import axios from 'axios';
import {WeekAmt, MoneyFormatter} from '../components/expenseUtil.js';

const Home = () => {
    const [expenses, setExpenses] = useState([]);
    const [income, setIncome] = useState([]);
    const [bills, setBills] = useState([]);


    const fetchSumExpenses = async() => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get("http://localhost:5000/expenses", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setExpenses(response.data);
            console.log("Fetched expenses"); // ✅ keep this
        } catch(error) {
            console.error("Error fetching expenses:", error);
        }
    };

    const fetchSumBills = async() => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get("http://localhost:5000/bills", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setBills(response.data);
            console.log("Fetched bills"); // ✅ keep this
        } catch(error) {
            console.error("Error fetching bills:", error);
        };
    };


    const fetchSumIncome = async() => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get("http://localhost:5000/income", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setIncome(response.data);
            console.log("Fetched income"); // ✅ keep this
        } catch(error) {
            console.error("Error fetching income:", error);
        };
    };

    useEffect(() => {
        fetchSumExpenses();
        fetchSumIncome();
        fetchSumBills();
    }, []);

    function getFridaysInMonth(year, month) {
        const fridays = [];
        const date = new Date(year, month, 1);
    
        while (date.getMonth() === month) {
            if (date.getDay() === 5) {
                fridays.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }
    
        return fridays;
    }

    function getBiWeeklyFridays(nextPayDate, year, month) {
        const biWeeklyFridays = [];
    
        const nextPay = new Date(nextPayDate);
        const prevPay = new Date(nextPay);
        prevPay.setDate(prevPay.getDate() - 14); // go back to last paycheck
    
        const current = new Date(prevPay);
    
        while (current.getFullYear() === year && current.getMonth() === month) {
            biWeeklyFridays.push(new Date(current));
            current.setDate(current.getDate() + 14);
        }
    
        return biWeeklyFridays;
    }
    

    const sumIncome = (incomes) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-based
    
        const fridays = getFridaysInMonth(year, month);
        const numFridays = fridays.length;
    
        let totalIncome = 0;
    
        incomes.forEach((income) => {
            if (income.frequency === "weekly") {
                totalIncome += income.amount * numFridays;
            } else if (income.frequency === "bi-weekly") {
                const biWeeklyFridays = getBiWeeklyFridays(income.date, year, month);
                totalIncome += income.amount * biWeeklyFridays.length;
            } else if (income.frequency === "monthly") {
                totalIncome += income.amount;
            }
        });
    
        return totalIncome;
    };
    

    // get total monthly sum of expenses
    const sumExpenses = expenses.map((expense) => {
        const weekCount = WeekAmt(expense.date);
        const amount = weekCount === 4 ? expense.amount_4_weeks : expense.amount_5_weeks;
        return Number(amount) || 0; // ensure it’s always a number
    });
    

    // get total monthly sum of bills
    const sumBills = (bills) => {
        if (!Array.isArray(bills)) return 0;
    
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
    
        const fridays = getFridaysInMonth(year, month);
        const numFridays = fridays.length;
    
        let totalBills = 0;
    
        bills.forEach((b) => {
            const amount = Number(b.amount) || 0;
    
            if (b.frequency === "weekly") {
                totalBills += amount * numFridays;
            }
            if (b.frequency === "bi-weekly") {
                const biWeeklyFridays = getBiWeeklyFridays(fridays, b.due_date);
                totalBills += amount * biWeeklyFridays.length;
            }
            if (b.frequency === "monthly" || b.frequency === "annually") {
                totalBills += amount;
            }
        });
    
        return totalBills;
    };
    

    const totalIncome = (sumIncome(income));
    const totalExpenses = Array.isArray(sumExpenses)
  ? sumExpenses.reduce((acc, curr) => acc + (Number(curr) || 0), 0)
  : 0;

  const totalBills = (Number(sumBills(bills)) || 0);

    const total = totalIncome - totalExpenses - totalBills;
    

    const sixtyPercent = (totalIncome * 0.6);
    const fiftyPercent = (totalIncome * 0.5);
    const thirtyPercent = (totalIncome * 0.3);
    const twentyPercent = (totalIncome * 0.2);

    return (
        <div className="home-container">
            <h1 className="tac">Welcome to your Budget Tracker</h1>
            <h2 className="tac header2">Let’s Dive Into Your Monthly Budget!</h2>
            <div className="summary-container">
    <div className="summary-card highlight-card">
        <h2><i className="fas fa-dollar-sign"></i> Total Income: <br /> {MoneyFormatter(totalIncome)}</h2>
        <p>Your hard-earned money – let's make it work for you!</p>
    </div>
    <div className="summary-card highlight-card">
        <h2><i className="fas fa-credit-card"></i> Total Bills: <br /> {MoneyFormatter(totalBills)}</h2>
        <p>These are the essentials that keep the lights on and everything running smoothly.</p>
    </div>
    <div className="summary-card highlight-card">
        <h2><i className="fas fa-shopping-cart"></i> Total Expenses: <br /> {MoneyFormatter(totalExpenses)}</h2>
        <p>Your lifestyle choices—whether it's groceries, shopping, or entertainment.</p>
    </div>
    <div className="summary-card highlight-card">
        <h2><i className="fas fa-piggy-bank"></i> Remaining: <br /> {MoneyFormatter(total)}</h2>
        <p>This is what’s left for saving, splurging, or future investments!</p>
    </div>
</div>
            <div className='budget-goals-container'>
                <h2 className='tac'>Budget Methods</h2>
                <p className='tac'>Explore some effective budgeting methods that can help you manage your finances with ease and clarity</p>
                <table className='budget-goals-table'>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>50/30/20 Method</th>
                            <th>60/20/20 Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Needs</td>
                            <td>{MoneyFormatter(fiftyPercent)}</td>
                            <td>{MoneyFormatter(sixtyPercent)}</td>
                        </tr>
                        <tr>
                            <td>Wants</td>
                            <td>{MoneyFormatter(thirtyPercent)}</td>
                            <td>{MoneyFormatter(twentyPercent)}</td>
                        </tr>
                        <tr>
                            <td>Savings</td>
                            <td>{MoneyFormatter(twentyPercent)}</td>
                            <td>{MoneyFormatter(twentyPercent)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
};



export default Home;

