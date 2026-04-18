const nodemailer = require("nodemailer");

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendOtpMail({ to, otpCode }) {
  const transport = getTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV OTP] ${to} => ${otpCode}`);
      return { simulated: true };
    }
    throw new Error("SMTP is not configured");
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "TeacherFinder qeydiyyat OTP kodu",
    text: `Sizin OTP kodunuz: ${otpCode}. Kod 10 deqiqe aktivdir.`,
    html: `<p>Sizin OTP kodunuz: <b>${otpCode}</b></p><p>Kod 10 deqiqe aktivdir.</p>`,
  });

  return { simulated: false };
}

module.exports = {
  sendOtpMail,
};
