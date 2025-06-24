import {jwtDecode} from "jwt-decode";
import {getCustomBudgetWeekRange} from "../components/expenseUtil";
import React from "react";
import { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import { useCallback } from 'react';

//dashboard header component
// This component displays the user's name and the current week's budget range

function DashboardHeader() {
    const token = localStorage.getItem("token");
    const decodedToken = token ? jwtDecode(token) : null;
    let firstName = "Guest";
    if (decodedToken) {
        if (decodedToken.name) {
            firstName = decodedToken.name.split(" ")[0];
        }
    }
    const [startDate, setStartDate] = useState("");
    const fetchStartDate = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:5000/date/startday", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setStartDate(response.data.budget_start_day);

        } catch (error) {
            console.error("Error fetching start date:", error);
        }
    }, [token]); 
    
    useEffect(() => {
        fetchStartDate();
    }, [fetchStartDate]);

    const budgetWeekRange = getCustomBudgetWeekRange(startDate);

  return (
      <div className="dashboard">
        <h1 className="tac regularHeader">{firstName}'s Dashboard</h1>
        <div className="dashboardContent">
            <h2 className="tac">Weekly Budget</h2>
            <h3 className="tac">{budgetWeekRange.startDate} - {budgetWeekRange.endDate}</h3>
            <p className="tac">This is where you can track your weekly budget.</p>
        </div>
      </div>
  );
}

export default DashboardHeader;