const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/applicationController");

router.get("/remembers/due", ctrl.getDueReminders);

router.get("/", ctrl.getApplications);
router.put("/:id", ctrl.updateApplication);

module.exports = router;