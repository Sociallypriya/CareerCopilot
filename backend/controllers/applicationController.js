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

// GET /api/applications/:id
exports.getApplicationById = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json(app);
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

// POST /api/applications
exports.createApplication = async (req, res) => {
  try {
    const app = await Application.create(req.body);
    res.status(201).json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// DELETE /api/applications/:id
exports.deleteApplication = async (req, res) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:id/notes  { text }
exports.addNote = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });
    app.notes.push({ text: req.body.text });
    await app.save();
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// POST /api/applications/:id/parse-email  { rawText }
exports.parseEmailAndUpdate = async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ message: "rawText is required" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    const extraction = await parseRecruiterEmail(rawText);

    app.lastRecruiterSummary = extraction.summary || null;
    app.lastRecruiterEmailAt = new Date();

    if (extraction.isRejection) {
      app.stage = "Rejected";
    } else if (extraction.stageDetected) {
      app.stage = extraction.stageDetected;
    }

    if (extraction.suggestedFollowUpDate) {
      app.followUpDate = new Date(extraction.suggestedFollowUpDate);
      app.reminderAcknowledged = false;
    }

    app.notes.push({ text: `[Agent summary] ${extraction.summary}` });

    await app.save();
    res.json({ application: app, extraction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};