const User = require("../models/User");
const { verifyToken } = require("../utils/auth");

module.exports = async (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ message: "Sign in to continue" });

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("name email");
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Your session expired. Sign in again." });
  }
};
