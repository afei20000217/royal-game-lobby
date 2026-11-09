const COOKIE = "__Host-royal_session";
const encoder = new TextEncoder();

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin || request.headers.get("Sec-Fetch-Site") === "cross-site") return json({ error: "請重新整理頁面後再試。" }, 403);
  const token = (request.headers.get("Cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  if (!token) return json({ error: "請先登入，才能使用帳戶飛飛幣遊玩。" }, 401);
  const tokenHash = await sha256(decodeURIComponent(token));
  const user = await env.DB.prepare("SELECT u.id, u.fly_coins FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  if (!user) return json({ error: "登入已逾時，請返回大廳重新登入。" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "扣款資料格式錯誤。" }, 400); }
  const requestId = String(body.requestId || "");
  const amount = Number(body.amount);
  const reason = String(body.reason || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !Number.isSafeInteger(amount) || amount < 1 || amount > 100000 || !["spin", "feature"].includes(reason)) return json({ error: "扣款資料無效。" }, 400);
  try {
    await env.DB.prepare("INSERT INTO game_wallet_debits (user_id, request_id, game, reason, amount, created_at) SELECT ?, ?, 'shanhaijing', ?, ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND fly_coins >= ?) ON CONFLICT(user_id, request_id) DO NOTHING").bind(user.id, requestId, reason, amount, Math.floor(Date.now() / 1000), user.id, amount).run();
  } catch { return json({ error: "扣款尚未完成，請查看餘額後再試。" }, 503); }
  const debit = await env.DB.prepare("SELECT amount, reason, balance_after FROM game_wallet_debits WHERE user_id = ? AND request_id = ?").bind(user.id, requestId).first();
  if (!debit) return json({ error: "飛飛幣不足，請降低下注金額。" }, 409);
  if (Number(debit.amount) !== amount || debit.reason !== reason) return json({ error: "扣款資料已使用，請重新開始操作。" }, 409);
  return json({ amount: Number(debit.amount), balance: Number(debit.balance_after) });
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
