import express from "express";
import cors from "cors";
import authRoutes from "./routes/authroutes.js";
import billRoutes from "./routes/billroutes.js";
import expenseRoutes from "./routes/expenseroutes.js";
import transactionRoutes from "./routes/transactionroutes.js";
import incomeRoutes from "./routes/incomeroutes.js";
import dateRoutes from "./routes/dateroutes.js";
import dashboardRoutes from "./routes/dashboardroutes.js";
import expenseSummaryRoutes from "./routes/expensesummaryroutes.js";
import monthlyExpenseRoutes from "./routes/monthlyexpenseroutes.js";

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

app.use("/auth", authRoutes);
app.use("/bills", billRoutes);
app.use("/expenses", expenseRoutes);
app.use("/transactions", transactionRoutes);
app.use("/income", incomeRoutes);
app.use("/date", dateRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/expensesummary", expenseSummaryRoutes);
app.use("/monthlyexpense", monthlyExpenseRoutes);



app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});