const Application = require("../models/Application");
const Settings = require("../models/Settings");
const User = require("../models/User");
const { createToken, hashPassword, verifyPassword, assertAuthConfigured } = require("../utils/auth");

const userResponse = user => ({ id: user._id, name: user.name, email: user.email });

async function prepareUserData(user, isFirstUser) {
  const key = String(user._id);
  if (isFirstUser) {
    await Application.updateMany({ owner: { $exists: false } }, { $set: { owner: user._id } });
    const legacySettings = await Settings.findOne({ key: "default" });
    if (legacySettings) {
      legacySettings.key = key;
      if (!legacySettings.profileName) legacySettings.profileName = user.name;
      if (!legacySettings.profileEmail) legacySettings.profileEmail = user.email;
      await legacySettings.save();
      return;
    }
  }
  await Settings.updateOne(
    { key },
    { $setOnInsert: { profileName: user.name, profileEmail: user.email } },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

exports.register = async (req, res) => {
  try {
    assertAuthConfigured();
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (name.length < 2) return res.status(400).json({ message: "Enter your name (at least 2 characters)" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists" });

    const isFirstUser = !(await User.exists({}));
    const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    await prepareUserData(user, isFirstUser);
    res.status(201).json({ token: createToken(user._id), user: userResponse(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "An account with this email already exists" });
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    assertAuthConfigured();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect" });
    }
    res.json({ token: createToken(user._id), user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.me = (req, res) => res.json({ user: userResponse(req.user) });
