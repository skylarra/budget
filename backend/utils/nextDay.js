import db from "../database.js";

async function updateDueDates() {
    try {
      const result = await db.query(`
        UPDATE bills
        SET due_date = CASE
          WHEN frequency = 'weekly' THEN due_date + INTERVAL '1 week'
          WHEN frequency = 'bi-weekly' THEN due_date + INTERVAL '2 weeks'
          WHEN frequency = 'monthly' THEN due_date + INTERVAL '1 month'
          WHEN frequency = 'annually' THEN due_date + INTERVAL '1 year'
          ELSE due_date
        END
        WHERE due_date < NOW(); -- Only update past due bills
      `);
      console.log('Due dates updated:', result.rowCount);
    } catch (err) {
      console.error('Error updating due dates:', err);
    }
  };

  
async function upcomingIncome() {
  try {
    const result = await db.query(`
      UPDATE income
      SET date = CASE
        WHEN frequency = 'weekly' THEN date + INTERVAL '1 week'
        WHEN frequency = 'bi-weekly' THEN date + INTERVAL '2 weeks'
        WHEN frequency = 'monthly' THEN date + INTERVAL '1 month'
        ELSE date
      END
      WHERE date < NOW(); -- Only update past due bills
    `);
    console.log('Upcoming income dates updated:', result.rowCount);
  } catch (err) {
    console.error('Error updating upcoming income dates:', err);
  }
};

export {updateDueDates, upcomingIncome};