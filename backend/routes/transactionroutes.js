import express from 'express';
import db from '../database.js';
import authenticateToken from '../middleware/authmiddleware.js';

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const query = `
            SELECT t.*, e.category
            FROM transactions t
            JOIN expenses e ON t.expense_id = e.id
            WHERE t.user_id = $1
            ORDER BY t.date DESC
        `;
        const values = [userId];
        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.post("/", authenticateToken, async (req, res) => {
    try {
        const { expense_id, amount, date } = req.body;

        // Validate input
        if (!expense_id || !amount || !date ) {
            return res.status(400).json({ error: "All fields are required" });
        }
        // Insert bill into database
        const query = `INSERT INTO transactions (user_id, expense_id, amount, date) VALUES ($1, $2, $3, $4) RETURNING *`;

        const values = [req.user.id, expense_id, amount, date || new Date()];
        const { rows } = await db.query(query, values);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const query = `DELETE FROM transactions WHERE id = $1 AND user_id = $2`;
        const values = [transactionId, req.user.id];

        const { rowCount } = await db.query(query, values);
        if (rowCount === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
);

export default router;