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

async function sendMail({ to, subject, text, html }) {
  const transport = getTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV MAIL] ${to} | ${subject}`);
      return { simulated: true };
    }
    throw new Error("SMTP is not configured");
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { simulated: false };
}

async function sendOtpMail({ to, otpCode }) {
  return sendMail({
    to,
    subject: "TeacherFinder qeydiyyat OTP kodu",
    text: `Sizin OTP kodunuz: ${otpCode}. Kod 10 deqiqe aktivdir.`,
    html: `<p>Sizin OTP kodunuz: <b>${otpCode}</b></p><p>Kod 10 deqiqe aktivdir.</p>`,
  });
}

async function sendTeacherApprovalMail({ to, name }) {
  const loginUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://teacher-finder-web.onrender.com/login";

  return sendMail({
    to,
    subject: "TeacherFinder muellim qeydiyyatiniz tesdiqlendi",
    text: `Salam ${name}, muellim qeydiyyatiniz admin terefinden tesdiqlendi. Artıq platformaya daxil ola bilersiniz: ${loginUrl}`,
    html: `<p>Salam <b>${name}</b>,</p><p>Muellim qeydiyyatiniz admin terefinden tesdiqlendi.</p><p>Artıq platformaya daxil ola bilersiniz: <a href="${loginUrl}">${loginUrl}</a></p>`,
  });
}

module.exports = {
  sendMail,
  sendOtpMail,
  sendTeacherApprovalMail,
};
