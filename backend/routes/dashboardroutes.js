import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';

const router = express.Router();

router.get("/weeksummary", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
    
        const query = `
            SELECT 'income' AS type, name, amount, date
            FROM income
            WHERE user_id = $1 AND date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'

            UNION ALL

            SELECT 'bill' AS type, name, amount, due_date AS date
            FROM bills
            WHERE userid = $1 AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'

            ORDER BY date ASC;
        `;
    
        const values = [userId];
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