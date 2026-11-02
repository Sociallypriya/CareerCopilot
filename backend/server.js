require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const connectDB = require("./config/db");
const applicationRoutes = require("./routes/applicationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const authRoutes = require("./routes/authRoutes");
const authenticate = require("./middleware/authenticate");

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*"}));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/applications", authenticate, applicationRoutes);
app.use("/api/settings", authenticate, settingsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
