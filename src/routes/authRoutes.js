const express = require("express");
const {
	login,
	register,
	sendRegisterOtp,
	verifyRegisterOtp,
	getInstagramOAuthUrl,
	instagramCallback,
	exchangeInstagramCode,
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/send-register-otp", sendRegisterOtp);
router.post("/verify-register-otp", verifyRegisterOtp);
router.get("/instagram/url", getInstagramOAuthUrl);
router.get("/instagram/callback", instagramCallback);
router.post("/instagram/exchange", exchangeInstagramCode);

module.exports = router;
