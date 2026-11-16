require("dotenv").config();

const express = require("express");
const path = require("path");

const db = require("./config/database");
const transactionRoutes = require("./routes/transaction.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/health", (req, res) => {
    res.status(200).json({ success: true, message: "Server is running" });
});

app.use("/", transactionRoutes);

// Start server
(async () => {
    try {
        await db.query("SELECT 1");
        console.log("Database connected successfully");

        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
})();