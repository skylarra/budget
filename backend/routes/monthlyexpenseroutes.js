import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';
import { monthDates } from '../utils/dateUtils.js';

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userStart = monthDates().startOfMonth;
        const userEnd = monthDates().endOfMonth;
        const weekCount = 5; // Assuming 5 weeks for the month
        const weekAmt = weekCount === 5 ? 'amount_5_weeks' : 'amount_4_weeks';
    
        const query = `
            SELECT 
                expenses.category,
                expenses.${weekAmt} AS amount,
                COALESCE(SUM(transactions.amount), 0) AS amount_used,
                expenses.${weekAmt} - COALESCE(SUM(transactions.amount), 0) AS amount_remaining,
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