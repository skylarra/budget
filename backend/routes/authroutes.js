import db from "../database.js";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        console.log("Received Body:", req.body); // ✅ Debugging line
        const { email, name, password, budget_start_date } = req.body;
        // Validate input
        if (!email || !name || !password || !budget_start_date) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if user already exists
        const userExists = await db.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);
        // Insert user into database
        const query = "INSERT INTO Users (email, name, hashed_password, budget_start_date) VALUES ($1, $2, $3, $4) RETURNING id";
        const values = [email, name, hashedPassword, budget_start_date];

        const result = await db.query(query, values);

        // Generate JWT token
        const token = jwt.sign({ id: result.rows[0].id }, "secret", { expiresIn: "1h" });

        res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
        console.error("Error in register route:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
         // Check if user exists
         const result = await db.query("SELECT * FROM Users WHERE email = $1", [email]);

         if (result.rows.length === 0) {
             return res.status(401).json({ error: "Invalid email or password" });
         }
 
         const user = result.rows[0];
 
         // Compare password
         const passwordMatch = await bcrypt.compare(password, user.hashed_password);
         if (!passwordMatch) {
             return res.status(401).json({ error: "Invalid password" });
         }
 
         // Generate JWT token
         const token = jwt.sign({ id: user.id, name: user.name }, "secret", { expiresIn: "3h" });
         res.status(200).json({ message: `Welcome, ${user.name}!`, token });
    } catch (error) {
        console.error("Error in login route", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;