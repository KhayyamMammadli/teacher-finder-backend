const express = require("express");
const {
  listTeachers,
  getTopTeachers,
  getTeacherById,
  getPopularSubjects,
  applyAsTeacher,
} = require("../controllers/teacherController");

const router = express.Router();

router.get("/", listTeachers);
router.get("/top", getTopTeachers);
router.get("/subjects/popular", getPopularSubjects);
router.get("/:id", getTeacherById);
router.post("/apply", applyAsTeacher);

module.exports = router;
