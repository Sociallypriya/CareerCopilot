const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/applicationController");

router.get("/reminders/due", ctrl.getDueReminders);

router.get("/", ctrl.getApplications);
router.post("/", ctrl.createApplication);

router.get("/:id", ctrl.getApplicationById);
router.put("/:id", ctrl.updateApplication);
router.delete("/:id", ctrl.deleteApplication);

router.post("/:id/notes", ctrl.addNote);
router.post("/:id/parse-email", ctrl.parseEmailAndUpdate);

module.exports = router;