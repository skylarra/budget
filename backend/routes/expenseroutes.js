import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';
import { updateDueDates } from '../utils/nextDay.js';

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {

        // Update due dates for expenses
        await updateDueDates();

        const query = `SELECT * FROM expenses WHERE user_id = $1 ORDER BY amount_4_weeks DESC`;
        const values = [req.user.id];

        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    try {
        const { category, amount_4_weeks, amount_5_weeks } = req.body;

        // Validate input
        if (!category || !amount_4_weeks || !amount_5_weeks ) {
            return res.status(400).json({ error: "All fields are required" });
        }
        // Insert bill into database
        const query = `INSERT INTO expenses (user_id, category, amount_4_weeks, amount_5_weeks) VALUES ($1, $2, $3, $4) RETURNING *`;

        const values = [req.user.id, category, amount_4_weeks, amount_5_weeks];
        const { rows } = await db.query(query, values);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creating expense:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const expenseId = req.params.id;
        const query = `DELETE FROM expenses WHERE id = $1 AND user_id = $2`;
        const values = [expenseId, req.user.id];

        const { rowCount } = await db.query(query, values);
        if (rowCount === 0) {
            return res.status(404).json({ error: "Expense not found" });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
);

export default router;