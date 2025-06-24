import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';
import { getCustomBudgetWeekRange, formatSqlDate, WeekAmt } from '../utils/dateUtils.js';

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const budgetStartDate = "saturday"; // This should be replaced with the actual budget start date from the database
        const userStart = formatSqlDate(getCustomBudgetWeekRange(budgetStartDate).startDate);
        const userEnd = formatSqlDate(getCustomBudgetWeekRange(budgetStartDate).endDate);

        const weekCount = WeekAmt(userStart.split("-")[0], userStart.split("-")[1] - 1);
        const weekAmt = weekCount === 5 ? 'amount_5_weeks' : 'amount_4_weeks';
    
        const query = `
            SELECT 
                expenses.category,
                COALESCE(SUM(expenses.${weekAmt} / ${weekCount}), 0) AS amount,
                COALESCE(SUM(transactions.amount), 0) AS amount_used,
                COALESCE(SUM(expenses.${weekAmt} / ${weekCount}), 0) - COALESCE(SUM(transactions.amount), 0) AS amount_remaining,
                COALESCE(
                    json_agg(
                    json_build_object(
                        'amount', transactions.amount,
                        'date', transactions.date
                    )
                    ) FILTER (WHERE transactions.id IS NOT NULL),
                    '[]'
                ) AS transactions
            FROM expenses
            LEFT JOIN transactions ON transactions.expense_id = expenses.id
            AND transactions.date BETWEEN $2 AND $3
            WHERE expenses.user_id = $1
            GROUP BY expenses.category, expenses.${weekAmt};

        `;
    
        const values = [userId, userStart, userEnd];
        const result = await db.query(query, values);
    
        res.json({
          activity: result.rows,
        });
    } catch (error) {
        console.error("Error fetching weekly summary:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;