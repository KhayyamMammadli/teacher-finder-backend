const express = require("express");
const {
  getOverview,
  listUsers,
  updateUser,
  deleteUser,
  listTeachersAdmin,
  updateTeacherAdmin,
  deleteTeacherAdmin,
  listBookingsAdmin,
  updateBookingStatusAdmin,
  deleteBookingAdmin,
  listTeacherApplications,
  deleteTeacherApplication,
  listTeacherRegistrationRequests,
  approveTeacherRegistrationRequest,
  rejectTeacherRegistrationRequest,
} = require("../controllers/adminController");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired, requireRole("admin"));

router.get("/overview", getOverview);
router.get("/users", listUsers);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/teachers", listTeachersAdmin);
router.patch("/teachers/:id", updateTeacherAdmin);
router.delete("/teachers/:id", deleteTeacherAdmin);
router.get("/bookings", listBookingsAdmin);
router.patch("/bookings/:id/status", updateBookingStatusAdmin);
router.delete("/bookings/:id", deleteBookingAdmin);
router.get("/teacher-applications", listTeacherApplications);
router.delete("/teacher-applications/:id", deleteTeacherApplication);
router.get("/teacher-registrations", listTeacherRegistrationRequests);
router.post("/teacher-registrations/:id/approve", approveTeacherRegistrationRequest);
router.post("/teacher-registrations/:id/reject", rejectTeacherRegistrationRequest);

module.exports = router;