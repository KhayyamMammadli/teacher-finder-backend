module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  META_APP_ID: process.env.META_APP_ID || "",
  META_APP_SECRET: process.env.META_APP_SECRET || "",
  META_REDIRECT_URI: process.env.META_REDIRECT_URI || "",
  WEB_APP_URL: process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
