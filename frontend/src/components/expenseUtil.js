import React, { useState, useEffect } from 'react';

const WeekStart = () => {
    const [weekStart, setWeekStart] = useState(new Date());

    // Function to calculate the start of the week
    const getWeekStart = (date) => {
        const currentDate = new Date(date);
        const currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
        
        // Calculate the difference to subtract from the current date
        const difference = currentDay === 0 ? 6 : currentDay - 1; // Assuming Monday is the first day of the week
        currentDate.setDate(currentDate.getDate() - difference);
        currentDate.setHours(0, 0, 0, 0); // Set time to the start of the day (midnight)
        
        return currentDate;
    };

    useEffect(() => {
        const interval = setInterval(() => {
            // Update the start of the week every minute
            setWeekStart(getWeekStart(new Date()));
        }, 60000); // 60 seconds

        return () => clearInterval(interval); // Clean up interval on component unmount
    }, []);

    return (
        <div>
            <p>Today's date: {new Date().toLocaleDateString()}</p>
            <p>Start of the week: {weekStart.toLocaleDateString()}</p>
        </div>
    );
};

const WeekAmt = (year, month) => {
    let count = 0;
    const date = new Date(year, month, 1);
  
    while (date.getMonth() === month) {
      if (date.getDay() === 5) { // 5 = Friday
        count++;
      }
      date.setDate(date.getDate() + 1);
    }
  
    return count;
  };

    // format the date to display in the UI
    function formatDate(date) {
        const newDate = new Date(date).toLocaleDateString()
        const dateComponents = newDate.split("/");
        const numMonth = dateComponents[0];
        const day = dateComponents[1];
        const year = dateComponents[2];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday','Friday', 'Saturday'];
        const specificDate = new Date(year, numMonth - 1, day);

        const dayOfWeek = weekdays[specificDate.getDay()];
        const month = months[numMonth - 1];

        return { dayOfWeek, month, day, year };};

        const getCustomBudgetWeekRange = (startDayName) => {
            const dayMap = {
              sunday: 0,
              monday: 1,
              tuesday: 2,
              wednesday: 3,
              thursday: 4,
              friday: 5,
              saturday: 6,
            };
          
            const today = new Date();
            const todayDay = today.getDay();
            const startDay = dayMap[startDayName.toLowerCase()];
          
            // Find most recent custom start day
            const daysSinceStart = (todayDay - startDay + 7) % 7;
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - daysSinceStart);
          
            // End date is 6 days after the start date
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
          
            // Format to MM/DD/YYY
            function formatDate(date) {
                const formattedDate = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                });
                return formattedDate;
              };
             
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
            };
        };

        const MoneyFormatter = (amount) => {
            return amount.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        };
  

export { WeekAmt, WeekStart, formatDate, getCustomBudgetWeekRange, MoneyFormatter };