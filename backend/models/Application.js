const mongoose = require("mongoose");

const STAGES = ["Applied","OA","Interview","Offer","Rejected","Ghosted"];
const SOURCES = ["LinkedIn", "Referral","Walk-in","Naukri","Company Site","Instagram","Other"];

const noteSchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const applicationSchema = new mongoose.Schema(
    {
        company: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        jobUrl: { type: String, trim: true },
        location: { type: String, trim: true },

        stage: { type: String, enum: STAGES, default: "Applied" },
        source: { type: String, enum: SOURCES, default: "Other" },

        appliedDate: { type: Date, default: Date.now },
        deadline: { type: Date },
        followUpDate: { type: Date },

        resumeVersionUsed: { type: String, trim: true },
        ctcDiscussed: { type: String, trim: true },
        ctcCurrency: { type: String, enum: ["INR", "USD", "GBP", "EUR", "AED", "SGD", "JPY", "AUD"], default: "INR" },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        notes: [noteSchema],

        lastRecruiterSummary: { type: String },
        lastRecruiterEmailAt: { type: Date },
        reminderAcknowledged: { type: Boolean, default: false },
    },
    { timestamps: true }
);

applicationSchema.index({ stage: 1 });
applicationSchema.index({ followUpDate: 1 });

module.exports = mongoose.model("Application", applicationSchema);
module.exports.STAGES = STAGES;
module.exports.SOURCES = SOURCES;
