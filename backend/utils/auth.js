const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, saltHex, hashHex] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length, SCRYPT_OPTIONS);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in backend/.env");
  return secret;
}

function assertAuthConfigured() {
  signingSecret();
}

function createToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), iat: now, exp: now + 60 * 60 * 24 * 7 })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", signingSecret()).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
  if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("Invalid token");
  const unsigned = `${headerPart}.${payloadPart}`;
  const expected = crypto.createHmac("sha256", signingSecret()).update(unsigned).digest();
  const actual = Buffer.from(signaturePart, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("Invalid token");
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) throw new Error("Expired token");
  return payload;
}

module.exports = { hashPassword, verifyPassword, createToken, verifyToken, assertAuthConfigured };
