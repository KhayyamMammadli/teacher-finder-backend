const express = require("express");
const {
	login,
	register,
	sendRegisterOtp,
	verifyRegisterOtp,
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/send-register-otp", sendRegisterOtp);
router.post("/verify-register-otp", verifyRegisterOtp);

module.exports = router;
