const express = require("express");
const {
  listTeacherRegistrationRequests,
  approveTeacherRegistrationRequest,
  rejectTeacherRegistrationRequest,
} = require("../controllers/adminController");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired, requireRole("admin"));

router.get("/teacher-registrations", listTeacherRegistrationRequests);
router.post("/teacher-registrations/:id/approve", approveTeacherRegistrationRequest);
router.post("/teacher-registrations/:id/reject", rejectTeacherRegistrationRequest);

module.exports = router;