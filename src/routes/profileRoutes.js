const express = require("express");
const { getMyProfile, updateMyProfile } = require("../controllers/profileController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);

module.exports = router;
