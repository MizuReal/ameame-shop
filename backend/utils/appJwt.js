const jwt = require("jsonwebtoken");

const APP_JWT_EXPIRES_IN = process.env.APP_JWT_EXPIRES_IN || "7d";
const APP_JWT_SECRET = process.env.APP_JWT_SECRET?.trim();

function getJwtSecret() {
  if (!APP_JWT_SECRET) {
    throw new Error("APP_JWT_SECRET is required.");
  }

  return APP_JWT_SECRET;
}

function issueAppJwt(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      firebaseUid: user.firebaseUid || "",
    },
    getJwtSecret(),
    {
      expiresIn: APP_JWT_EXPIRES_IN,
      issuer: "ameame-backend",
      audience: "ameame-mobile",
    }
  );
}

function verifyAppJwt(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "ameame-backend",
    audience: "ameame-mobile",
  });
}

module.exports = {
  APP_JWT_EXPIRES_IN,
  issueAppJwt,
  verifyAppJwt,
};
