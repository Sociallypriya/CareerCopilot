const Application = require("../models/Application");
const { parseRecruiterEmail } = require("../utils/geminiAgent");

//GET /api/applications
exports.getApplications = async (req, res) => {
    try{
        const filter = {};
        if(req.query.stage) filter.stage = req.query.stage;
        const apps = await Application.find(filter).sort({ updatedAt: -1 });
        res.json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/applications/:id
exports.updateApplication = async (req, res) => {
    try{
        const existing = await Application.findById(req.params.id);
        if(!existing) return res.status(404).json({ message: "Application not found" });

        if( req.body.followUpDate && new Date(req.body.followUpDate).getTime() !== new Date(existing.followUpDate).getTime()){
            req.body.reminderAcknowledged = false;
        }

        const updated = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true});
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// GET /api/applications/reminders/due
exports.getDueReminders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const due = await Application.find({
      followUpDate: { $lte: today },
      reminderAcknowledged: false,
      stage: { $nin: ["Rejected", "Offer", "Ghosted"] },
    }).sort({ followUpDate: 1 });
    res.json(due);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};