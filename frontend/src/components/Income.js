import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { formatDate } from './expenseUtil.js';

const Income = () => {
    const [income, setIncome] = useState([]);
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [day, setDay] = useState("");
    const [frequency, setFrequency] = useState("monthly");
    const [date, setDate] = useState("");
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    // fetch income from the server
    const fetchIncome = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:5000/income", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setIncome(response.data);
        } catch (error) {
            console.error("Error fetching income:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchIncome();
    }, [fetchIncome]);

    // add a new income
    const addIncome = async (e) => {
        e.preventDefault();

        if (!name || !amount || !day || !frequency || !date) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const response = await axios.post(
                "http://localhost:5000/income",
                { name, amount, day, frequency, date },
                { headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

                setIncome((prevIncome) => [...prevIncome, response.data]);
                setName("");
                setAmount("");
                setDay("");
                setFrequency("weekly");
                setDate("");
        } catch (error) {
            console.error("Error adding income:", error);
        }
    };

    // delete an income
    const deleteIncome = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/income/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setIncome((prevIncome) => prevIncome.filter((inc) => inc.id !== id));
        } catch (error) {
            console.error("Error deleting income:", error);
        }
    };

    // group the income by frequency
        const incomeGroups = {
            "Weekly": income.filter(b => b.frequency === "weekly"),
            "Bi-Weekly": income.filter(b => b.frequency === "bi-weekly"),
            "Monthly": income.filter(b => b.frequency === "monthly")
        };
    // render the income by frequency in the UI
        const renderincomeGroup = (title, incomeArray) => (
            <div className="bill-section" key={title}>
              <h3 className='tac'>{title} Income</h3>
              {incomeArray.length === 0 ? (
                <p className='tac'>No {title.toLowerCase()} income</p>
              ) : (
                incomeArray.map((income) => {
                  const { dayOfWeek, day, month } = formatDate(income.date);
                  return (
                    <div className='Bill' key={income.id}>
                      <div className='dateFormat tac'>
                        <p className='bold'>{dayOfWeek}</p>
                        <h3 className='bold number'>{day}</h3>
                        <p className='bold'>{month}</p>
                      </div>
                      <div className='Bill-name'>
                        <h2>{income.name}</h2>
                      </div>
                      <div className='Bill-amount'>
                        <p>${parseFloat(income.amount).toFixed(2)}</p>
                      </div>
                      <button className="Bill-delete" onClick={() => deleteIncome(income.id)}>X</button>
                    </div>
                  );
                })
              )}
            </div>
          );
    
          const [showForm, setShowForm] = useState(false);
        
          return (
            <div className="bills-container">
                <div className='bills-header'>
                    <h2 className='tac'>Your Income</h2>
                    <button className="open-form-btn" onClick={() => setShowForm(true)}>+ Add Income</button>
                </div>
              {loading ? (
                <p className='tac'>Loading...</p>
              ) : (
                <>
                  {Object.entries(incomeGroups).map(([title, income]) =>
                    renderincomeGroup(title, income)
                  )}
                </>
              )}
    
    {showForm && (
      <div className="modal-overlay">
        <div className="modal-content">
          <button className="close-btn" onClick={() => setShowForm(false)}>✖</button>
          <form onSubmit={addIncome} className="add-bill-form">
            <input
              type="text"
              placeholder="Income Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <input
              type="date"
              placeholder="Last Paid Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              required
            >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
            </select>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option>
            </select>
            <button type="submit">Add Bill</button>
          </form>
        </div>
      </div>
    )}
    
            </div>
)};

export default Income;