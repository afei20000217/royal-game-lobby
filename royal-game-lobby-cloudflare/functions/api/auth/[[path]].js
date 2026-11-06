const COOKIE = "__Host-royal_session";
const SESSION_SECONDS = 604800;
const PASSWORD_ITERATIONS = 600000;
const DUMMY_SALT = "e4c63d9b0fb7d8ae45b72feabf6e398d";
const DUMMY_HASH = "a4c2f0a0ec57f99e03e5f70a918d41e2e95d32221a1f0d3a5baf5af2893f7f37";
const VERIFIER_PATTERN = /^[a-f0-9]{64}$/;
const SALT_PATTERN = /^[a-f0-9]{32}$/;
const encoder = new TextEncoder();
const NIKO_ITEM_ID = "niko-cat";
const NIKO_PRICE = 5000;
const BAG_CAPACITY = 100;

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : (params.path || "");
  if (request.method === "GET" && path === "me") return json({ user: await sessionUser(request, env) });
  if (request.method === "GET" && path === "inventory") return inventory(request, env);
  if (request.method === "GET" && path === "mail/inbox") return mailbox(request, env, "inbox");
  if (request.method === "GET" && path === "mail/sent") return mailbox(request, env, "sent");
  if (request.method === "GET" && path === "admin/players") return adminPlayers(request, env);
  if (request.method === "GET" && path === "admin/player") return adminPlayer(request, env);
  if (request.method !== "POST") return json({ error: "不支援此操作。" }, 405, { Allow: "GET, POST" });
  if (!sameOrigin(request)) return json({ error: "請重新整理頁面後再試。" }, 403);
  if (path === "challenge") return challenge(request, env);
  if (path === "register") return register(request, env);
  if (path === "login") return login(request, env);
  if (path === "logout") return logout(request, env);
  if (path === "profile") return profile(request, env);
  if (path === "credentials") return credentials(request, env);
  if (path === "purchase") return purchase(request, env);
  if (path === "mail/send") return sendMail(request, env);
  if (path === "mail/read") return readMail(request, env);
  if (path === "mail/broadcast") return broadcastMail(request, env);
  if (path === "admin/player/update") return adminUpdatePlayer(request, env);
  return json({ error: "找不到此服務。" }, 404);
}

async function mailbox(request, env, view) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入後使用信箱。" }, 401);
  const now = Math.floor(Date.now() / 1000);
  const [playerRows, systemRows, unreadPlayer, unreadSystem] = await Promise.all([
    view === "inbox"
      ? env.DB.prepare("SELECT m.id, m.subject, m.body, m.created_at, m.read_at, s.nickname AS sender_name, r.nickname AS recipient_name FROM player_mail m JOIN users s ON s.id = m.sender_id JOIN users r ON r.id = m.recipient_id WHERE m.recipient_id = ? ORDER BY m.created_at DESC LIMIT 100").bind(user.id).all()
      : env.DB.prepare("SELECT m.id, m.subject, m.body, m.created_at, m.read_at, s.nickname AS sender_name, r.nickname AS recipient_name FROM player_mail m JOIN users s ON s.id = m.sender_id JOIN users r ON r.id = m.recipient_id WHERE m.sender_id = ? ORDER BY m.created_at DESC LIMIT 100").bind(user.id).all(),
    view === "inbox"
      ? env.DB.prepare("SELECT m.id, m.subject, m.body, m.created_at, CASE WHEN r.message_id IS NULL THEN 0 ELSE 1 END AS is_read FROM system_mail m LEFT JOIN system_mail_reads r ON r.message_id = m.id AND r.user_id = ? ORDER BY m.created_at DESC LIMIT 100").bind(user.id).all()
      : env.DB.prepare("SELECT id, subject, body, created_at FROM system_mail WHERE sender_id = ? ORDER BY created_at DESC LIMIT 100").bind(user.id).all(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM player_mail WHERE recipient_id = ? AND read_at IS NULL").bind(user.id).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM system_mail m LEFT JOIN system_mail_reads r ON r.message_id = m.id AND r.user_id = ? WHERE r.message_id IS NULL").bind(user.id).first()
  ]);
  const player = (playerRows.results || []).map((row) => ({
    id: row.id, type: "player", subject: row.subject, body: row.body, createdAt: row.created_at,
    isRead: view === "sent" || Boolean(row.read_at),
    senderName: row.sender_name || "玩家", recipientName: row.recipient_name || "玩家"
  }));
  const system = (systemRows.results || []).map((row) => ({
    id: row.id, type: "system", subject: row.subject, body: row.body, createdAt: row.created_at,
    isRead: view === "sent" || Boolean(row.is_read), senderName: "系統公告",
    recipientName: view === "sent" ? "所有玩家" : (user.nickname || user.username)
  }));
  const items = [...player, ...system].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  return json({ items, unread: Number(unreadPlayer?.count || 0) + Number(unreadSystem?.count || 0) });
}

async function sendMail(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入後寄信。" }, 401);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const recipientName = normalizeNickname(body.recipient);
  const subject = mailText(body.subject, 80);
  const content = mailText(body.body, 2000);
  if (!recipientName || !subject || !content) return json({ error: "請填寫有效的收件人暱稱、主旨與信件內容。" }, 400);
  if (await limited(env, "mail", user.username, 30, 3600)) return json({ error: "寄信次數過多，請稍後再試。" }, 429);
  const recipient = await env.DB.prepare("SELECT id, nickname FROM users WHERE nickname = ? COLLATE NOCASE").bind(recipientName).first();
  if (!recipient) return json({ error: "找不到這個暱稱，請確認收件人名稱。" }, 404);
  if (recipient.id === user.id) return json({ error: "不能寄信給自己。" }, 400);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("INSERT INTO player_mail (id, sender_id, recipient_id, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, user.id, recipient.id, subject, content, now).run();
  return json({ ok: true, id });
}

async function readMail(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入後閱讀信件。" }, 401);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  if (typeof body.id !== "string" || !["player", "system"].includes(body.type)) return json({ error: "信件資料不正確。" }, 400);
  let result;
  if (body.type === "player") {
    result = await env.DB.prepare("UPDATE player_mail SET read_at = ? WHERE id = ? AND recipient_id = ? AND read_at IS NULL")
      .bind(Math.floor(Date.now() / 1000), body.id, user.id).run();
    if (!Number(result.meta?.changes || 0)) {
      const existing = await env.DB.prepare("SELECT id FROM player_mail WHERE id = ? AND recipient_id = ?").bind(body.id, user.id).first();
      if (!existing) return json({ error: "找不到這封信，或你沒有讀取權限。" }, 404);
    }
  } else {
    const existing = await env.DB.prepare("SELECT id FROM system_mail WHERE id = ?").bind(body.id).first();
    if (!existing) return json({ error: "找不到這封公告。" }, 404);
    await env.DB.prepare("INSERT OR IGNORE INTO system_mail_reads (user_id, message_id, read_at) VALUES (?, ?, ?)")
      .bind(user.id, body.id, Math.floor(Date.now() / 1000)).run();
  }
  return mailbox(request, env, "inbox");
}

async function broadcastMail(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入後發布公告。" }, 401);
  if (!user.isAdmin) return json({ error: "只有管理員可以發布全體公告。" }, 403);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const subject = mailText(body.subject, 80);
  const content = mailText(body.body, 2000);
  if (!subject || !content) return json({ error: "請填寫公告主旨與內容。" }, 400);
  if (await limited(env, "broadcast", user.username, 10, 3600)) return json({ error: "公告發布次數過多，請稍後再試。" }, 429);
  await env.DB.prepare("INSERT INTO system_mail (id, sender_id, subject, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), user.id, subject, content, Math.floor(Date.now() / 1000)).run();
  return json({ ok: true });
}

async function adminPlayers(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入管理後台。" }, 401);
  if (!user.isAdmin) return json({ error: "只有系統管理員可以查看玩家資料。" }, 403);
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
  const like = `%${query}%`;
  const serialLike = `%${query.replace(/^0+(?=\d)/u, "")}%`;
  const where = "(? = '' OR CAST(p.number AS TEXT) LIKE ? OR u.username LIKE ? COLLATE NOCASE OR COALESCE(u.nickname, '') LIKE ? COLLATE NOCASE)";
  const total = await env.DB.prepare(`SELECT COUNT(*) AS count FROM users u JOIN player_numbers p ON p.user_id = u.id WHERE ${where}`)
    .bind(query, serialLike, like, like).first();
  const rows = await env.DB.prepare(`SELECT u.id, p.number AS player_number, u.username, u.nickname, u.region, u.birthday_year_roc, u.birthday_month, u.birthday_day, u.gender, u.created_at, u.fly_coins, u.is_admin, u.is_super_admin, CASE WHEN u.avatar_data_url IS NULL THEN 0 ELSE 1 END AS has_avatar FROM users u JOIN player_numbers p ON p.user_id = u.id WHERE ${where} ORDER BY p.number ASC LIMIT 50 OFFSET ?`)
    .bind(query, serialLike, like, like, (page - 1) * 50).all();
  return json({ players: rows.results || [], total: Number(total?.count || 0), page, pageSize: 50 });
}

async function adminPlayer(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入管理後台。" }, 401);
  if (!user.isAdmin) return json({ error: "只有系統管理員可以查看玩家資料。" }, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 80) return json({ error: "玩家資料不正確。" }, 400);
  const player = await env.DB.prepare("SELECT u.id, p.number AS player_number, u.username, u.nickname, u.region, u.birthday_year_roc, u.birthday_month, u.birthday_day, u.gender, u.created_at, u.fly_coins, u.is_admin, u.is_super_admin, u.avatar_data_url FROM users u JOIN player_numbers p ON p.user_id = u.id WHERE u.id = ?").bind(id).first();
  if (!player) return json({ error: "找不到這位玩家。" }, 404);
  return json({ player: {
    id: player.id, playerNumber: String(player.player_number).padStart(8, "0"), username: player.username,
    nickname: player.nickname, region: player.region, birthday: player.birthday_year_roc ? {
      year: player.birthday_year_roc, month: player.birthday_month, day: player.birthday_day
    } : null, gender: player.gender, createdAt: player.created_at, flyCoins: Number(player.fly_coins || 0),
    isAdmin: Boolean(Number(player.is_admin || 0)), isSuperAdmin: Boolean(Number(player.is_super_admin || 0)), avatar: player.avatar_data_url || null
  } });
}

async function adminUpdatePlayer(request, env) {
  const admin = await sessionUser(request, env);
  if (!admin) return json({ error: "請先登入管理後台。" }, 401);
  if (!admin.isAdmin) return json({ error: "只有系統管理員可以修改玩家資料。" }, 403);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  if (typeof body.id !== "string" || body.id.length > 80) return json({ error: "玩家資料不正確。" }, 400);
  const account = accountName(body.account);
  const nickname = typeof body.nickname === "string" && body.nickname.trim() ? normalizeNickname(body.nickname) : null;
  if (!account || (body.nickname && !nickname)) return json({ error: "帳號或暱稱格式不正確。" }, 400);
  const region = body.region === "" || body.region === null ? null : body.region;
  if (region !== null && !REGIONS.includes(region)) return json({ error: "請選擇有效的台灣地區。" }, 400);
  const gender = body.gender === "" || body.gender === null ? null : body.gender;
  if (gender !== null && !["男", "女"].includes(gender)) return json({ error: "請選擇有效的性別。" }, 400);
  const yearRaw = body.year === "" || body.year === null ? null : Number(body.year);
  const monthRaw = body.month === "" || body.month === null ? null : Number(body.month);
  const dayRaw = body.day === "" || body.day === null ? null : Number(body.day);
  const birthdayEmpty = yearRaw === null && monthRaw === null && dayRaw === null;
  const maxRocYear = new Date().getFullYear() - 1911;
  if (!birthdayEmpty) {
    if (!Number.isInteger(yearRaw) || yearRaw < 80 || yearRaw > maxRocYear || !Number.isInteger(monthRaw) || monthRaw < 1 || monthRaw > 12 || !Number.isInteger(dayRaw) || dayRaw < 1 || dayRaw > new Date(1911 + yearRaw, monthRaw, 0).getDate()) {
      return json({ error: `生日需為民國 80 年至 ${maxRocYear} 年內的有效日期。` }, 400);
    }
  }
  const flyCoins = Number(body.flyCoins);
  if (!Number.isSafeInteger(flyCoins) || flyCoins < 0 || flyCoins > 2147483647) return json({ error: "飛飛幣需為 0 到 2,147,483,647 的整數。" }, 400);
  if (typeof body.isAdmin !== "boolean" || typeof body.removeAvatar !== "boolean") return json({ error: "管理欄位資料不正確。" }, 400);
  const resettingPassword = body.passwordLength !== null && body.passwordLength !== undefined;
  if (resettingPassword && (!validPasswordLength(body.passwordLength) || typeof body.passwordSalt !== "string" || !SALT_PATTERN.test(body.passwordSalt) || typeof body.passwordVerifier !== "string" || !VERIFIER_PATTERN.test(body.passwordVerifier))) {
    return json({ error: "新密碼需為 10–128 個字元，且安全處理資料必須有效。" }, 400);
  }
  if (body.id === admin.id && !body.isAdmin) return json({ error: "不能移除自己目前使用的管理員權限。" }, 409);
  const existing = await env.DB.prepare("SELECT id, is_admin, is_super_admin FROM users WHERE id = ?").bind(body.id).first();
  if (!existing) return json({ error: "找不到這位玩家。" }, 404);
  if (Number(existing.is_super_admin || 0) === 1 && !body.isAdmin) return json({ error: "不能移除最高管理員的管理權限。" }, 409);
  if (Number(existing.is_admin || 0) !== Number(body.isAdmin) && !admin.isSuperAdmin) return json({ error: "只有最高管理員可以授予或移除管理員權限。" }, 403);
  if (Number(existing.is_admin) === 1 && !body.isAdmin) {
    const admins = await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE is_admin = 1").first();
    if (Number(admins?.count || 0) <= 1) return json({ error: "平台至少需要保留一位管理員。" }, 409);
  }
  try {
    const passwordHash = resettingPassword ? `v2:${await sha256(body.passwordVerifier)}` : null;
    await env.DB.prepare("UPDATE users SET username = ?, nickname = ?, region = ?, birthday_year_roc = ?, birthday_month = ?, birthday_day = ?, gender = ?, fly_coins = ?, is_admin = ?, avatar_data_url = CASE WHEN ? = 1 THEN NULL ELSE avatar_data_url END, password_salt = CASE WHEN ? = 1 THEN ? ELSE password_salt END, password_hash = CASE WHEN ? = 1 THEN ? ELSE password_hash END, password_iterations = CASE WHEN ? = 1 THEN ? ELSE password_iterations END WHERE id = ?")
      .bind(account, nickname, region, birthdayEmpty ? null : yearRaw, birthdayEmpty ? null : monthRaw, birthdayEmpty ? null : dayRaw, gender, flyCoins, body.isAdmin ? 1 : 0, body.removeAvatar ? 1 : 0, resettingPassword ? 1 : 0, body.passwordSalt, resettingPassword ? 1 : 0, passwordHash, resettingPassword ? 1 : 0, PASSWORD_ITERATIONS, body.id).run();
  } catch {
    return json({ error: "帳號或暱稱已被其他玩家使用。" }, 409);
  }
  if (resettingPassword) {
    const token = cookieValue(request, COOKIE);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(body.id, await sha256(token)).run();
    else await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(body.id).run();
  }
  const updated = await env.DB.prepare("SELECT users.id, users.username, users.nickname, users.created_at, users.region, users.birthday_year_roc, users.birthday_month, users.birthday_day, users.gender, users.avatar_data_url, users.fly_coins, users.is_admin, users.is_super_admin, player_numbers.number AS player_number FROM users JOIN player_numbers ON player_numbers.user_id = users.id WHERE users.id = ?").bind(body.id).first();
  return json({ ok: true, player: publicUser(updated) });
}

function mailText(value, maxLength) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  const length = Array.from(result).length;
  return length >= 1 && length <= maxLength && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result) ? result : null;
}

async function inventory(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入後查看包包。" }, 401);
  const result = await env.DB.prepare("SELECT item_id, purchased_at FROM player_inventory WHERE user_id = ? ORDER BY purchased_at DESC")
    .bind(user.id).all();
  const items = result.results || [];
  return json({ items, used: items.length, capacity: BAG_CAPACITY });
}

async function purchase(request, env) {
  const user = await sessionUser(request, env);
  if (!user) return json({ error: "請先登入後購買商品。" }, 401);
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  if (body.itemId !== NIKO_ITEM_ID) return json({ error: "找不到這個商品。" }, 404);

  const owned = await env.DB.prepare("SELECT item_id FROM player_inventory WHERE user_id = ? AND item_id = ?")
    .bind(user.id, NIKO_ITEM_ID).first();
  if (owned) return json({ error: "你的包包裡已經有尼可了。" }, 409);
  const summary = await env.DB.prepare("SELECT fly_coins, (SELECT COUNT(*) FROM player_inventory WHERE user_id = ?) AS used FROM users WHERE id = ?")
    .bind(user.id, user.id).first();
  if (Number(summary?.used || 0) >= BAG_CAPACITY) return json({ error: "包包已滿，請先整理空間。" }, 409);
  if (Number(summary?.fly_coins || 0) < NIKO_PRICE) return json({ error: "飛飛幣不足，無法購買尼可。" }, 409);

  const purchasedAt = Math.floor(Date.now() / 1000);
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE users SET fly_coins = fly_coins - ? WHERE id = ? AND fly_coins >= ? AND NOT EXISTS (SELECT 1 FROM player_inventory WHERE user_id = ? AND item_id = ?) AND (SELECT COUNT(*) FROM player_inventory WHERE user_id = ?) < ?")
      .bind(NIKO_PRICE, user.id, NIKO_PRICE, user.id, NIKO_ITEM_ID, user.id, BAG_CAPACITY),
    env.DB.prepare("INSERT INTO player_inventory (user_id, item_id, purchased_at) SELECT ?, ?, ? WHERE changes() = 1")
      .bind(user.id, NIKO_ITEM_ID, purchasedAt)
  ]);
  if (Number(results[0]?.meta?.changes || 0) !== 1) {
    const latest = await env.DB.prepare("SELECT fly_coins, (SELECT COUNT(*) FROM player_inventory WHERE user_id = ?) AS used FROM users WHERE id = ?")
      .bind(user.id, user.id).first();
    const alreadyOwned = await env.DB.prepare("SELECT item_id FROM player_inventory WHERE user_id = ? AND item_id = ?")
      .bind(user.id, NIKO_ITEM_ID).first();
    if (alreadyOwned) return json({ error: "你的包包裡已經有尼可了。" }, 409);
    if (Number(latest?.used || 0) >= BAG_CAPACITY) return json({ error: "包包已滿，請先整理空間。" }, 409);
    if (Number(latest?.fly_coins || 0) < NIKO_PRICE) return json({ error: "飛飛幣不足，無法購買尼可。" }, 409);
    return json({ error: "購買沒有完成，請稍後再試。" }, 500);
  }

  const updatedUser = await sessionUser(request, env);
  const bag = await env.DB.prepare("SELECT item_id, purchased_at FROM player_inventory WHERE user_id = ? ORDER BY purchased_at DESC")
    .bind(user.id).all();
  return json({ user: updatedUser, items: bag.results || [], used: (bag.results || []).length, capacity: BAG_CAPACITY });
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
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, username, password_salt, password_hash, password_iterations, nickname, created_at, fly_coins) VALUES (?, ?, ?, ?, ?, NULL, ?, 10000)")
        .bind(id, username, body.salt, hash, PASSWORD_ITERATIONS, now),
      env.DB.prepare("INSERT INTO player_numbers (user_id) VALUES (?)").bind(id)
    ]);
  } catch {
    return json({ error: "帳號建立失敗，請稍後再試。" }, 500);
  }
  const newUser = await env.DB.prepare("SELECT users.id, users.username, users.nickname, users.created_at, users.fly_coins, users.is_admin, player_numbers.number AS player_number FROM users JOIN player_numbers ON player_numbers.user_id = users.id WHERE users.id = ?").bind(id).first();
  return json({ user: publicUser(newUser) }, 201, { "Set-Cookie": await createSession(env, id) });
}

async function login(request, env) {
  const body = await readBody(request);
  if (body.error) return json({ error: body.error }, 400);
  const username = accountName(body.account);
  if (!username || !validPasswordLength(body.passwordLength) || typeof body.passwordVerifier !== "string" || !VERIFIER_PATTERN.test(body.passwordVerifier)) {
    return json({ error: "帳號或密碼錯誤。" }, 401);
  }
  if (await limited(env, "login", username, 10, 900)) return json({ error: "嘗試次數過多，請 15 分鐘後再試。" }, 429);
  const user = await env.DB.prepare("SELECT users.id, users.username, users.nickname, users.created_at, users.password_hash, users.region, users.birthday_year_roc, users.birthday_month, users.birthday_day, users.gender, users.avatar_data_url, users.fly_coins, users.is_admin, users.is_super_admin, player_numbers.number AS player_number FROM users JOIN player_numbers ON player_numbers.user_id = users.id WHERE users.username = ?").bind(username).first();
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
    flyCoins: Number(user.fly_coins ?? 10000),
    playerNumber: String(Number(user.player_number || 0)).padStart(8, "0"),
    isAdmin: Boolean(Number(user.is_admin || 0)),
    isSuperAdmin: Boolean(Number(user.is_super_admin || 0))
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
  const user = await env.DB.prepare("SELECT users.id, users.username, users.nickname, users.created_at, users.region, users.birthday_year_roc, users.birthday_month, users.birthday_day, users.gender, users.avatar_data_url, users.fly_coins, users.is_admin, users.is_super_admin, player_numbers.number AS player_number FROM sessions JOIN users ON users.id = sessions.user_id JOIN player_numbers ON player_numbers.user_id = users.id WHERE sessions.token_hash = ? AND sessions.expires_at > ?")
    .bind(await sha256(token), now).first();
  return user ? publicUser(user) : null;
}
