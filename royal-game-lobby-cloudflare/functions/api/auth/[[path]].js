const COOKIE = "__Host-royal_session";
const SESSION_SECONDS = 604800;
const PASSWORD_ITERATIONS = 600000;
const encoder = new TextEncoder();
const DUMMY_SALT = "e4c63d9b0fb7d8ae45b72feabf6e398d";
const DUMMY_HASH = "a4c2f0a0ec57f99e03e5f70a918d41e2e95d32221a1f0d3a5baf5af2893f7f37";

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : (params.path || "");
  if (request.method === "GET" && path === "me") return json({ user: await sessionUser(request, env) });
  if (request.method !== "POST") return json({ error: "不支援此操作。" }, 405, { Allow: "GET, POST" });
  if (!sameOrigin(request)) return json({ error: "請重新整理頁面後再試。" }, 403);
  if (path === "register") return register(request, env);
  if (path === "login") return login(request, env);
  if (path === "logout") return logout(request, env);
  if (path === "profile") return profile(request, env);
  return json({ error: "找不到此服務。" }, 404);
}

async function register(request, env) {
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const username = accountName(body.account);
  if (!username) return json({ error: "帳號需為 3–24 位英文、數字、底線或連字號，並以英文或數字開頭。" }, 400);
  if (!validPassword(body.password)) return json({ error: "密碼需為 10–128 個字元。" }, 400);
  if (await limited(env, "register", username, 8, 3600)) return json({ error: "建立帳號次數過多，請一小時後再試。" }, 429);
  if (await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first()) return json({ error: "這個帳號已經有人使用。" }, 409);
  const salt = randomHex(16);
  const hash = await passwordHash(body.password, salt);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare("INSERT INTO users (id, username, password_salt, password_hash, password_iterations, nickname, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)").bind(id, username, salt, hash, PASSWORD_ITERATIONS, now).run();
  } catch {
    return json({ error: "帳號建立失敗，請稍後再試。" }, 500);
  }
  return json({ user: { id, username, nickname: null } }, 201, { "Set-Cookie": await createSession(env, id) });
}

async function login(request, env) {
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const username = accountName(body.account);
  if (!username || typeof body.password !== "string" || Array.from(body.password).length > 128) return json({ error: "帳號或密碼錯誤。" }, 401);
  if (await limited(env, "login", username, 10, 900)) return json({ error: "嘗試次數過多，請 15 分鐘後再試。" }, 429);
  const user = await env.DB.prepare("SELECT id, username, nickname, password_salt, password_hash, password_iterations FROM users WHERE username = ?").bind(username).first();
  const salt = user ? user.password_salt : DUMMY_SALT;
  const hash = await passwordHash(body.password, salt, Number(user ? user.password_iterations : PASSWORD_ITERATIONS));
  if (!user || !constantEqual(hash, user.password_hash || DUMMY_HASH)) return json({ error: "帳號或密碼錯誤。" }, 401);
  await env.DB.prepare("DELETE FROM auth_attempts WHERE bucket_hash = ?").bind(await bucketHash("login", username)).run();
  return json({ user: { id: user.id, username: user.username, nickname: user.nickname } }, 200, { "Set-Cookie": await createSession(env, user.id) });
}

async function logout(request, env) {
  const token = cookieValue(request, COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ user: null }, 200, { "Set-Cookie": setCookie("", 0) });
}

async function profile(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "登入狀態已失效，請重新登入。" }, 401);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const nickname = normalizeNickname(body.nickname);
  if (!nickname) return json({ error: "暱稱需為 1–24 個字，且不能包含控制字元。" }, 400);
  await env.DB.prepare("UPDATE users SET nickname = ? WHERE id = ?").bind(nickname, user.id).run();
  return json({ user: { id: user.id, username: user.username, nickname } });
}

async function getMe(request, env) { return json({ user: await sessionUser(request, env) }); }
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
}
function sameOrigin(request) { return request.headers.get("Origin") === new URL(request.url).origin; }
async function readBody(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return { error: "請使用有效的表單資料。" };
  try {
    const text = await request.text();
    if (text.length > 4096) return { error: "輸入內容太長。" };
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : { error: "表單資料格式不正確。" };
  } catch { return { error: "表單資料格式不正確。" }; }
}
function accountName(value) {
  if (typeof value !== "string") return null;
  const result = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{2,23}$/.test(result) ? result : null;
}
function validPassword(value) {
  const count = typeof value === "string" ? Array.from(value).length : 0;
  return count >= 10 && count <= 128;
}
function normalizeNickname(value) {
  if (typeof value !== "string") return null;
  const result = value.trim().normalize("NFC");
  const count = Array.from(result).length;
  return count >= 1 && count <= 24 && !/[\u0000-\u001f\u007f]/u.test(result) ? result : null;
}
function hex(bytes) { return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function fromHex(value) {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
function randomHex(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}
async function sha256(value) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
async function bucketHash(scope, username) { return sha256(scope + ":" + username); }
async function limited(env, scope, username, limit, seconds) {
  const key = await bucketHash(scope, username);
  const now = Math.floor(Date.now() / 1000);
  const reset = now + seconds;
  await env.DB.prepare("INSERT INTO auth_attempts (bucket_hash, attempts, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket_hash) DO UPDATE SET attempts = CASE WHEN auth_attempts.reset_at <= ? THEN 1 ELSE auth_attempts.attempts + 1 END, reset_at = CASE WHEN auth_attempts.reset_at <= ? THEN ? ELSE auth_attempts.reset_at END").bind(key, reset, now, now, reset).run();
  const row = await env.DB.prepare("SELECT attempts FROM auth_attempts WHERE bucket_hash = ?").bind(key).first();
  return Number(row?.attempts || 0) > limit;
}
async function passwordHash(password, saltHex, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromHex(saltHex), iterations, hash: "SHA-256" }, key, 256);
  return hex(bits);
}
function constantEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function cookieValue(request, name) {
  for (const item of (request.headers.get("Cookie") || "").split(";")) {
    const index = item.indexOf("=");
    if (index >= 0 && item.slice(0, index).trim() === name) return item.slice(index + 1).trim();
  }
  return null;
}
function setCookie(value, age) { return COOKIE + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + age; }
async function createSession(env, userId) {
  const token = randomToken();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), userId, now + SESSION_SECONDS, now).run();
  return setCookie(token, SESSION_SECONDS);
}
async function sessionUser(request, env) {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const user = await env.DB.prepare("SELECT users.id, users.username, users.nickname FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(await sha256(token), now).first();
  return user ? { id: user.id, username: user.username, nickname: user.nickname } : null;
}
