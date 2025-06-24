import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';

const router = express.Router();

router.get("/startday", authenticateToken, async (req, res) => {
    try {
        const query = "SELECT budget_start_day FROM Users WHERE id = $1";
        const values = [req.user.id];
        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const budgetStartDay = result.rows[0].budget_start_day;
        res.status(200).json({ budget_start_day: budgetStartDay });
    } catch (error) {
        console.error("Error fetching budget start date:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;