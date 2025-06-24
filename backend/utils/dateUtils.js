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
    const startDay = dayMap[startDayName];
  
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

const formatSqlDate = (day) => {
  const date = day.split("/");
  const month = date[0];
  const dayNum = date[1];
  const year = date[2];

  const SqlDate = year + "-" + month + "-" + dayNum;
  return SqlDate;
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

const monthDates = () => {
  const today = new Date();

  // First day of current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Last day of current month
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Optional: format as yyyy-mm-dd for SQL or frontend
  const formatDate = (date) => date.toISOString().split('T')[0];
  return {
    startOfMonth: formatDate(startOfMonth),
    endOfMonth: formatDate(endOfMonth),
  };
};


export { getCustomBudgetWeekRange , formatSqlDate, WeekAmt, monthDates};