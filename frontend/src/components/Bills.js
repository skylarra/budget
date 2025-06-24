import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { formatDate, MoneyFormatter } from './expenseUtil.js';

const Bills = () => {
    const [bills, setBills] = useState([]);
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [frequency, setFrequency] = useState("monthly");
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    // fetch bills from the server
    const fetchBills = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:5000/bills", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setBills(response.data);
        } catch (error) {
            console.error("Error fetching bills:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

// add a new bill

const addBill = async (e) => {
    e.preventDefault();

    if (!name || !amount || !dueDate) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await axios.post(
            "http://localhost:5000/bills",
            { name, amount, due_date: dueDate, frequency },
            { headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

            setBills((prevbills) => [...prevbills, response.data]);
            setName("");
            setAmount("");
            setDueDate("");
            setFrequency("monthly");
    } catch (error) {
        console.error("Error adding bill:", error);
    }}

// update a bill
const updateBill = async (id) => {};

// delete a bill

    const deleteBill = async (id) => {
        try {
            const response = await axios.delete(`http://localhost:5000/bills/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 204) {
                setBills((prevBills) => prevBills.filter((bill) => bill.id !== id));
            } else {
                console.error("Error deleting bill:", response.statusText);
            }
        } catch (error) {
            console.error("Error deleting bill:", error);
    }};
    
        // format the date to display in the UI
    
// group the bills by frequency
    const billGroups = {
        "Weekly": bills.filter(b => b.frequency === "weekly"),
        "Bi-Weekly": bills.filter(b => b.frequency === "bi-weekly"),
        "Monthly": bills.filter(b => b.frequency === "monthly"),
        "Annual": bills.filter(b => b.frequency === "annually")
    };
// render the bills by frequency in the UI
    const renderBillGroup = (title, billArray) => (
        <div className="bill-section" key={title}>
          <h3 className='tac'>{title} Bills</h3>
          {billArray.length === 0 ? (
            <p className='tac'>No {title.toLowerCase()} bills</p>
          ) : (
            billArray.map((bill) => {
              const { dayOfWeek, day, month } = formatDate(bill.due_date);
              return (
                <div className='Bill' key={bill.id}>
                  <div className='dateFormat tac'>
                    <p className='bold'>{dayOfWeek}</p>
                    <h3 className='bold number'>{day}</h3>
                    <p className='bold'>{month}</p>
                  </div>
                  <div className='Bill-name'>
                    <h2>{bill.name}</h2>
                  </div>
                  <div className='Bill-amount'>
                    <p>{MoneyFormatter(parseFloat(bill.amount))}</p>
                  </div>
                  <button className="Bill-delete" onClick={() => deleteBill(bill.id)}>X</button>
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
                <h2 className='tac'>Your Bills</h2>
                <button className="open-form-btn" onClick={() => setShowForm(true)}>+ Add Bill</button>
            </div>
          {loading ? (
            <p className='tac'>Loading...</p>
          ) : (
            <>
              {Object.entries(billGroups).map(([title, bills]) =>
                renderBillGroup(title, bills)
              )}
            </>
          )}

{showForm && (
  <div className="modal-overlay">
    <div className="modal-content">
      <button className="close-btn" onClick={() => setShowForm(false)}>✖</button>
      <form onSubmit={addBill} className="add-bill-form">
        <input
          type="text"
          placeholder="Bill Name"
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
          placeholder="Due Date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          required
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="annually">Yearly</option>
        </select>
        <button type="submit">Add Bill</button>
      </form>
    </div>
  </div>
)}

        </div>

        )};

export default Bills;