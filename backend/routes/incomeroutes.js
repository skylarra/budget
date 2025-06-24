import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';
import {upcomingIncome} from '../utils/nextDay.js';

const router = express.Router();


// Get all income for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Update upcoming dates for income
        await upcomingIncome();
        const query = `SELECT * FROM income WHERE user_id = $1 ORDER BY amount DESC`;
        const values = [req.user.id];

        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching income:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Add a new income entry for the authenticated user
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { name, amount, day, frequency, date } = req.body;

        const query = `INSERT INTO income (user_id, name, amount, day, frequency, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [req.user.id, name, amount, day, frequency, date];

        const { rows } = await db.query(query, values);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creating income:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Delete an income entry for the authenticated user
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const incomeId = req.params.id;
        const query = `DELETE FROM income WHERE id = $1 AND user_id = $2`;
        const values = [incomeId, req.user.id];

        const { rowCount } = await db.query(query, values);
        if (rowCount === 0) {
            return res.status(404).json({ error: "Income not found" });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting income:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;