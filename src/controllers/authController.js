const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomInt } = require("crypto");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/constants");
const { query } = require("../config/db");
const { createId } = require("../utils/id");
const { sendOtpMail } = require("../utils/mailer");

function toAuthResponse(user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  };
}

async function sendRegisterOtp(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email teleb olunur" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await query("select id from users where lower(email) = $1", [normalizedEmail]);
  if (exists.rowCount) {
    return res.status(409).json({ message: "Bu email artiq qeydiyyatdadir" });
  }

  const otpCode = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await query("update email_otps set consumed = true where email = $1 and purpose = 'register' and consumed = false", [
    normalizedEmail,
  ]);
  await query(
    "insert into email_otps (id, email, purpose, otp_code, expires_at, consumed) values ($1, $2, 'register', $3, $4, false)",
    [createId("otp"), normalizedEmail, otpCode, expiresAt]
  );

  const mailStatus = await sendOtpMail({ to: normalizedEmail, otpCode });

  return res.status(201).json({
    message: "OTP kod emaila gonderildi",
    ...(mailStatus.simulated ? { devOtp: otpCode } : {}),
  });
}

async function verifyRegisterOtp(req, res) {
  const { name, email, password, phone, otp } = req.body;

  if (!name || !email || !password || !otp) {
    return res.status(400).json({ message: "Ad, email, sifre ve OTP teleb olunur" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await query("select id from users where lower(email) = $1", [normalizedEmail]);
  if (exists.rowCount) {
    return res.status(409).json({ message: "Bu email artiq qeydiyyatdadir" });
  }

  const otpResult = await query(
    "select * from email_otps where email = $1 and purpose = 'register' and consumed = false order by created_at desc limit 1",
    [normalizedEmail]
  );

  if (!otpResult.rowCount) {
    return res.status(400).json({ message: "OTP tapilmadi" });
  }

  const otpRow = otpResult.rows[0];
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ message: "OTP muddeti bitib" });
  }

  if (String(otpRow.otp_code) !== String(otp)) {
    return res.status(400).json({ message: "OTP yanlisdir" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = createId("u");

  const userInsert = await query(
    "insert into users (id, role, name, email, password_hash, phone) values ($1,'shop_owner',$2,$3,$4,$5) returning id, role, name, email, phone",
    [id, name, normalizedEmail, passwordHash, phone || ""]
  );

  await query("update email_otps set consumed = true where id = $1", [otpRow.id]);

  return res.status(201).json(toAuthResponse(userInsert.rows[0]));
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email ve sifre teleb olunur" });
  }

  const result = await query("select * from users where lower(email) = $1", [String(email).toLowerCase()]);
  if (!result.rowCount) {
    return res.status(401).json({ message: "Email ve ya sifre sehvdir" });
  }

  const user = result.rows[0];

  const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok) {
    return res.status(401).json({ message: "Email ve ya sifre sehvdir" });
  }

  return res.json(toAuthResponse(user));
}

async function register(req, res) {
  return res.status(410).json({
    message: "Qeydiyyat ucun OTP axinindan istifade edin",
  });
}

module.exports = {
  sendRegisterOtp,
  verifyRegisterOtp,
  register,
  login,
};
