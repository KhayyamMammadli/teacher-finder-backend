const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");
const { query } = require("../config/db");

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userResult = await query("select id, role from users where id = $1", [payload.sub]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}

module.exports = {
  authRequired,
  requireRole,
};
