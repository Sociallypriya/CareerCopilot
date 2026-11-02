const Settings = require("../models/Settings");

const editableFields = ["profileName", "profileEmail", "workspaceName", "timezone", "currency"];

function publicSettings(settings) {
  return {
    profileName: settings?.profileName || "",
    profileEmail: settings?.profileEmail || "",
    workspaceName: settings?.workspaceName || "My workspace",
    timezone: settings?.timezone || "Asia/Kolkata",
    currency: settings?.currency || "INR",
  };
}

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: String(req.user._id) }).lean();
    res.json(publicSettings(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    for (const field of editableFields) {
      if (Object.hasOwn(body, field)) updates[field] = body[field];
    }
    const settings = await Settings.findOneAndUpdate(
      { key: String(req.user._id) },
      { $set: updates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    res.json(publicSettings(settings));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
