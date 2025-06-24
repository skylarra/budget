import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';
import { updateDueDates } from '../utils/nextDay.js';

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {

        // Update due dates for bills
        await updateDueDates();

        const query = `SELECT * FROM Bills WHERE userid = $1 ORDER BY amount DESC`;
        const values = [req.user.id];

        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching bills:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    try {
        const { name, amount, due_date, frequency } = req.body;

        // Validate input
        if (!name || !amount || !due_date || !frequency) {
            return res.status(400).json({ error: "All fields are required" });
        }
        // Insert bill into database
        const query = `INSERT INTO Bills (userid, name, amount, due_date, frequency) VALUES ($1, $2, $3, $4, $5) RETURNING *`;

        const values = [req.user.id, name, amount, due_date, frequency];
        const { rows } = await db.query(query, values);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creating bill:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.patch("/:id", authenticateToken, async (req, res) => {
    try {
        const billId = req.params.id;
        const { name, amount, due_date, frequency } = req.body;

        // Validate input
        if (!name || !amount || !due_date || !frequency) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Update bill in database
        const query = `UPDATE Bills SET name = $1, amount = $2, due_date = $3, frequency = $4 WHERE id = $5 AND userid = $6 RETURNING *`;
        const values = [name, amount, due_date, frequency, billId, req.user.id];

        const { rows } = await db.query(query, values);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Bill not found" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error updating bill:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const billId = req.params.id;
        const query = `DELETE FROM Bills WHERE id = $1 AND userid = $2`;
        const values = [billId, req.user.id];

        const { rowCount } = await db.query(query, values);
        if (rowCount === 0) {
            return res.status(404).json({ error: "Bill not found" });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting bill:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
);

export default router;