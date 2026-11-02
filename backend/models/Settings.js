const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  profileName: { type: String, trim: true, default: "" },
  profileEmail: { type: String, trim: true, lowercase: true, default: "" },
  workspaceName: { type: String, trim: true, default: "My workspace" },
  timezone: { type: String, trim: true, default: "Asia/Kolkata" },
  currency: { type: String, enum: ["INR", "USD", "GBP", "EUR", "AED", "SGD", "JPY", "AUD"], default: "INR" },
}, { timestamps: true });

module.exports = mongoose.model("Settings", settingsSchema);
