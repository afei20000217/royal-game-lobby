const COOKIE = "__Host-royal_session";
const SESSION_SECONDS = 604800;
const PASSWORD_ITERATIONS = 600000;
const DUMMY_SALT = "e4c63d9b0fb7d8ae45b72feabf6e398d";
const DUMMY_HASH = "a4c2f0a0ec57f99e03e5f70a918d41e2e95d32221a1f0d3a5baf5af2893f7f37";
const VERIFIER_PATTERN = /^[a-f0-9]{64}$/;
const SALT_PATTERN = /^[a-f0-9]{32}$/;
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : (params.path || "");
  if (request.method === "GET" && path === "me") return json({ user: await sessionUser(request, env) });
  if (request.method !== "POST") return json({ error: "不支援此操作。" }, 405, { Allow: "GET, POST" });
  if (!sameOrigin(request)) return json({ error: "請重新整理頁面後再試。" }, 403);
  if (path === "challenge") return challenge(request, env);
  if (path === "register") return register(request, env);
  if (path === "login") return login(request, env);
  if (path === "logout") return logout(request, env);
  if (path === "profile") return profile(request, env);
  if (path === "credentials") return credentials(request, env);
  return json({ error: "找不到此服務。" }, 404);
}

async function challenge(request, env) {
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const username = accountName(body.account);
  if (!username) return json({ error: "帳號需為 1–24 個字，不能空白或包含控制字元。" }, 400);
  const user = await env.DB.prepare("SELECT password_salt, password_iterations FROM users WHERE username = ?").bind(username).first();
  return json({
    salt: user?.password_salt || DUMMY_SALT,
    iterations: Number(user?.password_iterations || PASSWORD_ITERATIONS)
  });
}

async function register(request, env) {
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const username = accountName(body.account);
  if (!username) return json({ error: "帳號需為 1–24 個字，不能空白或包含控制字元。" }, 400);
  if (!validPasswordLength(body.passwordLength)) return json({ error: "密碼需為 10–128 個字元。" }, 400);
  if (typeof body.salt !== "string" || !SALT_PATTERN.test(body.salt) || typeof body.passwordVerifier !== "string" || !VERIFIER_PATTERN.test(body.passwordVerifier)) {
    return json({ error: "密碼處理失敗，請重新操作。" }, 400);
  }
  if (await limited(env, "register", username, 8, 3600)) return json({ error: "建立帳號次數過多，請一小時後再試。" }, 429);
  if (await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first()) return json({ error: "這個帳號已經有人使用。" }, 409);

  const hash = `v2:${await sha256(body.passwordVerifier)}`;
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare("INSERT INTO users (id, username, password_salt, password_hash, password_iterations, nickname, created_at, fly_coins) VALUES (?, ?, ?, ?, ?, NULL, ?, 10000)")
      .bind(id, username, body.salt, hash, PASSWORD_ITERATIONS, now).run();
  } catch {
    return json({ error: "帳號建立失敗，請稍後再試。" }, 500);
  }
  return json({ user: { id, username, nickname: null, createdAt: now, flyCoins: 10000 } }, 201, { "Set-Cookie": await createSession(env, id) });
}

async function login(request, env) {
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const username = accountName(body.account);
  if (!username || !validPasswordLength(body.passwordLength) || typeof body.passwordVerifier !== "string" || !VERIFIER_PATTERN.test(body.passwordVerifier)) {
    return json({ error: "帳號或密碼錯誤。" }, 401);
  }
  if (await limited(env, "login", username, 10, 900)) return json({ error: "嘗試次數過多，請 15 分鐘後再試。" }, 429);
  const user = await env.DB.prepare("SELECT id, username, nickname, created_at, password_hash, region, birthday_year_roc, birthday_month, birthday_day, gender, avatar_data_url, fly_coins FROM users WHERE username = ?").bind(username).first();
  const isVersion2 = user?.password_hash?.startsWith("v2:");
  const submittedHash = isVersion2 ? await sha256(body.passwordVerifier) : body.passwordVerifier;
  const expectedHash = isVersion2 ? user.password_hash.slice(3) : (user?.password_hash || DUMMY_HASH);
  if (!user || !constantEqual(submittedHash, expectedHash)) return json({ error: "帳號或密碼錯誤。" }, 401);

  if (!isVersion2) {
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?")
      .bind(`v2:${await sha256(body.passwordVerifier)}`, user.id, user.password_hash).run();
  }
  await env.DB.prepare("DELETE FROM auth_attempts WHERE bucket_hash = ?").bind(await bucketHash("login", username)).run();
  return json({ user: publicUser(user) }, 200, { "Set-Cookie": await createSession(env, user.id) });
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
  const field = body.field || "nickname";
  const value = body.field ? body.value : body.nickname;
  if (field === "nickname") {
    const nickname = normalizeNickname(value);
    if (!nickname) return json({ error: "暱稱需為 1–24 個字，且不能包含控制字元。" }, 400);
    if (await env.DB.prepare("SELECT id FROM users WHERE nickname = ? COLLATE NOCASE AND id <> ?").bind(nickname, user.id).first()) {
      return json({ error: "這個暱稱已有人使用，請換一個。" }, 409);
    }
    try { await env.DB.prepare("UPDATE users SET nickname = ? WHERE id = ?").bind(nickname, user.id).run(); }
    catch { return json({ error: "這個暱稱已有人使用，請換一個。" }, 409); }
  } else if (field === "region") {
    if (!REGIONS.includes(value)) return json({ error: "請選擇有效的台灣地區。" }, 400);
    await env.DB.prepare("UPDATE users SET region = ? WHERE id = ?").bind(value, user.id).run();
  } else if (field === "birthday") {
    const { year, month, day } = value || {};
    const currentRocYear = Number(new Intl.DateTimeFormat("zh-TW-u-ca-roc", { timeZone: "Asia/Taipei", year: "numeric" }).format(new Date()).replace(/[^\d]/g, ""));
    const days = Number.isInteger(year) && Number.isInteger(month) ? new Date(1911 + year, month, 0).getDate() : 0;
    if (!Number.isInteger(year) || year < 80 || year > currentRocYear || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > days) {
      return json({ error: `生日需介於民國80年至民國${currentRocYear}年，並選擇有效日期。` }, 400);
    }
    await env.DB.prepare("UPDATE users SET birthday_year_roc = ?, birthday_month = ?, birthday_day = ? WHERE id = ?").bind(year, month, day, user.id).run();
  } else if (field === "gender") {
    if (value !== "男" && value !== "女") return json({ error: "請選擇男或女。" }, 400);
    await env.DB.prepare("UPDATE users SET gender = ? WHERE id = ?").bind(value, user.id).run();
  } else if (field === "avatar") {
    if (value !== null && (typeof value !== "string" || value.length > 380000 || !/^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))) {
      return json({ error: "請上傳有效的圖片（壓縮後需小於 280 KB）。" }, 400);
    }
    await env.DB.prepare("UPDATE users SET avatar_data_url = ? WHERE id = ?").bind(value, user.id).run();
  } else return json({ error: "找不到這個玩家資料欄位。" }, 400);
  return json({ user: await sessionUser(request, env) });
}

async function credentials(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "登入狀態已失效，請重新登入。" }, 401);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  if (!validPasswordLength(body.passwordLength) || typeof body.passwordVerifier !== "string" || !VERIFIER_PATTERN.test(body.passwordVerifier)) {
    return json({ error: "請輸入正確的目前密碼。" }, 400);
  }
  if (await limited(env, "credentials", user.username, 8, 900)) return json({ error: "變更嘗試次數過多，請 15 分鐘後再試。" }, 429);
  const stored = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first();
  const version2 = stored?.password_hash?.startsWith("v2:");
  const supplied = version2 ? await sha256(body.passwordVerifier) : body.passwordVerifier;
  const expected = version2 ? stored.password_hash.slice(3) : (stored?.password_hash || DUMMY_HASH);
  if (!stored || !constantEqual(supplied, expected)) return json({ error: "目前密碼不正確。" }, 401);

  if (body.type === "account") {
    const username = accountName(body.newAccount);
    if (!username) return json({ error: "新帳號需為 1–24 個字，且不能包含控制字元。" }, 400);
    try {
      await env.DB.prepare("UPDATE users SET username = ? WHERE id = ?").bind(username, user.id).run();
    } catch {
      return json({ error: "這個帳號已經有人使用，請換一個。" }, 409);
    }
    await env.DB.prepare("DELETE FROM auth_attempts WHERE bucket_hash = ?").bind(await bucketHash("credentials", user.username)).run();
    return json({ user: await sessionUser(request, env) });
  }

  if (body.type === "password") {
    if (!validPasswordLength(body.newPasswordLength) || typeof body.newSalt !== "string" || !SALT_PATTERN.test(body.newSalt) || typeof body.newPasswordVerifier !== "string" || !VERIFIER_PATTERN.test(body.newPasswordVerifier)) {
      return json({ error: "新密碼需為 10–128 個字元，請重新輸入。" }, 400);
    }
    await env.DB.prepare("UPDATE users SET password_salt = ?, password_hash = ?, password_iterations = ? WHERE id = ?")
      .bind(body.newSalt, `v2:${await sha256(body.newPasswordVerifier)}`, PASSWORD_ITERATIONS, user.id).run();
    const token = cookieValue(request, COOKIE);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(user.id, await sha256(token)).run();
    await env.DB.prepare("DELETE FROM auth_attempts WHERE bucket_hash = ?").bind(await bucketHash("credentials", user.username)).run();
    return json({ user: await sessionUser(request, env), sessionsRevoked: true });
  }
  return json({ error: "請選擇要修改帳號或密碼。" }, 400);
}

const REGIONS = ["台北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "台南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣"];

function publicUser(user) {
  return {
    id: user.id, username: user.username, nickname: user.nickname, createdAt: user.created_at,
    region: user.region || null,
    birthday: user.birthday_year_roc ? { year: user.birthday_year_roc, month: user.birthday_month, day: user.birthday_day } : null,
    gender: user.gender || null,
    avatar: user.avatar_data_url || null,
    flyCoins: Number(user.fly_coins ?? 10000)
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
}

function sameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

async function readBody(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return { error: "請使用有效的表單資料。" };
  try {
    const text = await request.text();
    if (text.length > 500000) return { error: "輸入內容太長。" };
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : { error: "表單資料格式不正確。" };
  } catch {
    return { error: "表單資料格式不正確。" };
  }
}

function accountName(value) {
  if (typeof value !== "string") return null;
  const result = value.trim().normalize("NFC").toLowerCase();
  const length = Array.from(result).length;
  return length >= 1 && length <= 24 && !/[\u0000-\u001f\u007f]/u.test(result) ? result : null;
}

function validPasswordLength(value) {
  return Number.isInteger(value) && value >= 10 && value <= 128;
}

function normalizeNickname(value) {
  if (typeof value !== "string") return null;
  const result = value.trim().normalize("NFC");
  const count = Array.from(result).length;
  return count >= 1 && count <= 24 && !/[\u0000-\u001f\u007f]/u.test(result) ? result : null;
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function bucketHash(scope, username) {
  return sha256(scope + ":" + username);
}

async function limited(env, scope, username, limit, seconds) {
  const key = await bucketHash(scope, username);
  const now = Math.floor(Date.now() / 1000);
  const reset = now + seconds;
  await env.DB.prepare("INSERT INTO auth_attempts (bucket_hash, attempts, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket_hash) DO UPDATE SET attempts = CASE WHEN auth_attempts.reset_at <= ? THEN 1 ELSE auth_attempts.attempts + 1 END, reset_at = CASE WHEN auth_attempts.reset_at <= ? THEN ? ELSE auth_attempts.reset_at END")
    .bind(key, reset, now, now, reset).run();
  const row = await env.DB.prepare("SELECT attempts FROM auth_attempts WHERE bucket_hash = ?").bind(key).first();
  return Number(row?.attempts || 0) > limit;
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

function setCookie(value, age) {
  return COOKIE + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + age;
}

async function createSession(env, userId) {
  const token = randomToken();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), userId, now + SESSION_SECONDS, now).run();
  return setCookie(token, SESSION_SECONDS);
}

async function sessionUser(request, env) {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const user = await env.DB.prepare("SELECT users.id, users.username, users.nickname, users.created_at, users.region, users.birthday_year_roc, users.birthday_month, users.birthday_day, users.gender, users.avatar_data_url, users.fly_coins FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?")
    .bind(await sha256(token), now).first();
  return user ? publicUser(user) : null;
}
