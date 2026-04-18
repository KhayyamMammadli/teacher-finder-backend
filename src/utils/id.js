const { randomUUID } = require("crypto");

function createId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

module.exports = {
  createId,
};
