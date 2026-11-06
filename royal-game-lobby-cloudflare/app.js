const authDialog = document.querySelector("#auth-dialog");
const nicknameDialog = document.querySelector("#nickname-dialog");
const profileDialog = document.querySelector("#profile-dialog");
const playerWidget = document.querySelector("#player-widget");
const authButton = document.querySelector("#auth-button");
const userLabel = document.querySelector("#user-label");
const playerName = document.querySelector("#player-name");
const profileNickname = document.querySelector("#profile-nickname");
const profileAccount = document.querySelector("#profile-account");
const profileJoined = document.querySelector("#profile-joined");
const profileLogin = document.querySelector("#profile-login");
const authForm = document.querySelector("#auth-form");
const accountInput = document.querySelector("#account");
const passwordInput = document.querySelector("#password");
const authMessage = document.querySelector("#auth-message");
const authSubmit = document.querySelector("#auth-submit");
const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");
const nicknameForm = document.querySelector("#nickname-form");
const nicknameInput = document.querySelector("#nickname");
const nicknameMessage = document.querySelector("#nickname-message");
const nicknameSubmit = document.querySelector("#nickname-submit");
const toast = document.querySelector("#toast");

let mode = "login";
let currentUser = null;
let toastTimer;
const PASSWORD_ITERATIONS = 600_000;
const encoder = new TextEncoder();

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function derivePasswordVerifier(password, saltHex, iterations = PASSWORD_ITERATIONS) {
  if (!crypto.subtle) throw new Error("目前瀏覽器無法安全處理密碼，請更新瀏覽器後再試。");
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    credentials: "same-origin"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "目前無法完成操作，請稍後再試。");
  return result;
}

function updateAccountUI() {
  if (currentUser) {
    authButton.textContent = "登出";
    authButton.setAttribute("aria-label", `登出${currentUser.nickname ? `（${currentUser.nickname}）` : ""}`);
    userLabel.hidden = true;
    userLabel.textContent = currentUser.nickname || currentUser.username;
    playerName.textContent = currentUser.nickname || currentUser.username;
  } else {
    authButton.textContent = "登入";
    authButton.setAttribute("aria-label", "登入");
    userLabel.hidden = true;
    userLabel.textContent = "";
    playerName.textContent = "訪客玩家";
  }
  updateProfileUI();
}

function updateProfileUI() {
  profileNickname.textContent = currentUser?.nickname || (currentUser ? "尚未設定暱稱" : "訪客玩家");
  profileAccount.textContent = currentUser ? `帳號：${currentUser.username}` : "訪客模式";
  profileJoined.textContent = currentUser?.createdAt
    ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(new Date(Number(currentUser.createdAt) * 1000))
    : currentUser ? "資料尚未提供" : "登入後顯示";
  profileLogin.hidden = Boolean(currentUser);
  document.querySelector('[data-profile-value="nickname"]').textContent = currentUser?.nickname || "尚未設定";
  document.querySelector('[data-profile-value="region"]').textContent = currentUser?.region || "尚未設定";
  document.querySelector('[data-profile-value="birthday"]').textContent = currentUser?.birthday
    ? `民國${currentUser.birthday.year}年${currentUser.birthday.month}月${currentUser.birthday.day}日` : "尚未設定";
  document.querySelector('[data-profile-value="gender"]').textContent = currentUser?.gender || "尚未設定";
  document.querySelectorAll("[data-edit-field]").forEach((button) => { button.hidden = !currentUser; });
}

function openProfileDialog() {
  updateProfileUI();
  profileDialog.showModal();
}

function setMode(nextMode) {
  mode = nextMode;
  const isLogin = mode === "login";
  loginTab.setAttribute("aria-selected", String(isLogin));
  registerTab.setAttribute("aria-selected", String(!isLogin));
  document.querySelector("#auth-title").textContent = isLogin ? "歡迎回來" : "建立你的帳號";
  document.querySelector(".dialog-intro").textContent = isLogin ? "登入後進入皇家大廳" : "使用帳號和密碼加入皇家大廳";
  authSubmit.textContent = isLogin ? "登入" : "註冊並繼續";
  passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
  showMessage(authMessage, "");
}

function openAuth(initialMode = "login") {
  setMode(initialMode);
  authForm.reset();
  authDialog.showModal();
  accountInput.focus();
}

async function loadSession() {
  try {
    const result = await api("/api/auth/me");
    currentUser = result.user;
    updateAccountUI();
    if (currentUser && !currentUser.nickname) openNicknameDialog();
  } catch {
    currentUser = null;
    updateAccountUI();
  }
}

function openNicknameDialog() {
  nicknameForm.reset();
  showMessage(nicknameMessage, "");
  nicknameDialog.showModal();
  nicknameInput.focus();
}

nicknameDialog.addEventListener("cancel", (event) => {
  if (currentUser && !currentUser.nickname) event.preventDefault();
});

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});

playerWidget.addEventListener("click", openProfileDialog);
profileLogin.addEventListener("click", () => {
  profileDialog.close();
  openAuth("login");
});

const regions = ["台北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "台南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣"];
const rocYear = new Intl.DateTimeFormat("zh-TW-u-ca-roc", { timeZone: "Asia/Taipei", year: "numeric" }).format(new Date()).replace(/\D/g, "") || "115";
const birthdayForm = document.querySelector('[data-profile-form="birthday"]');
const monthSelect = birthdayForm.elements.month;
const daySelect = birthdayForm.elements.day;
const yearSelect = birthdayForm.elements.year;
const option = (value, label = value) => new Option(label, value);
const regionSelect = document.querySelector('[data-profile-form="region"] [name="region"]');
regions.forEach((region) => regionSelect.add(option(region)));
for (let y = 80; y <= Number(rocYear); y += 1) yearSelect.add(option(y, `民國${y}年`));
for (let m = 1; m <= 12; m += 1) monthSelect.add(option(m, `${m}月`));
function refreshBirthdayDays(selected = "") {
  const month = Number(monthSelect.value || 1);
  const year = 1911 + Number(yearSelect.value || rocYear);
  const count = new Date(year, month, 0).getDate();
  daySelect.replaceChildren(option("", "日期"));
  for (let day = 1; day <= count; day += 1) daySelect.add(option(day, `${day}日`));
  if (selected && Number(selected) <= count) daySelect.value = selected;
}
yearSelect.addEventListener("change", () => refreshBirthdayDays());
monthSelect.addEventListener("change", () => refreshBirthdayDays());
refreshBirthdayDays();

document.querySelectorAll("[data-edit-field]").forEach((button) => button.addEventListener("click", () => {
  const field = button.dataset.editField;
  document.querySelectorAll("[data-profile-form]").forEach((form) => { form.hidden = true; });
  const form = document.querySelector(`[data-profile-form="${field}"]`);
  const value = currentUser?.[field];
  if (field === "nickname") form.elements.nickname.value = currentUser?.nickname || "";
  if (field === "region") form.elements.region.value = value || "";
  if (field === "gender") form.elements.gender.value = value || "";
  if (field === "birthday") {
    yearSelect.value = value?.year || "";
    monthSelect.value = value?.month || "";
    refreshBirthdayDays(value?.day || "");
  }
  form.querySelector(".profile-editor-message").textContent = "";
  form.hidden = false;
}));
document.querySelectorAll("[data-cancel-field]").forEach((button) => button.addEventListener("click", () => {
  document.querySelector(`[data-profile-form="${button.dataset.cancelField}"]`).hidden = true;
}));
document.querySelectorAll("[data-profile-form]").forEach((form) => form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const field = form.dataset.profileForm;
  const values = new FormData(form);
  let value;
  if (field === "birthday") value = { year: Number(values.get("year")), month: Number(values.get("month")), day: Number(values.get("day")) };
  else value = String(values.get(field) || "").trim();
  const message = form.querySelector(".profile-editor-message");
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  message.textContent = "儲存中…";
  try {
    const result = await api("/api/auth/profile", { method: "POST", body: { field, value } });
    currentUser = result.user;
    updateAccountUI();
    form.hidden = true;
    showToast("玩家資料已更新");
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  } finally { submit.disabled = false; }
}));

authButton.addEventListener("click", async () => {
  if (!currentUser) {
    openAuth("login");
    return;
  }
  authButton.disabled = true;
  try {
    await api("/api/auth/logout", { method: "POST", body: {} });
    currentUser = null;
    updateAccountUI();
    showToast("已安全登出");
  } catch (error) {
    showToast(error.message);
  } finally {
    authButton.disabled = false;
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(authMessage, "");
  if (!authForm.reportValidity()) return;

  const account = accountInput.value.trim();
  const password = passwordInput.value;
  const passwordLength = Array.from(password).length;
  authSubmit.disabled = true;
  authSubmit.textContent = mode === "login" ? "登入中…" : "安全建立帳號中…";
  try {
    if (passwordLength < 10 || passwordLength > 128) throw new Error("密碼需為 10–128 個字元。");
    let result;
    if (mode === "register") {
      const salt = randomSalt();
      const passwordVerifier = await derivePasswordVerifier(password, salt);
      result = await api("/api/auth/register", {
        method: "POST",
        body: { account, salt, passwordVerifier, passwordLength }
      });
    } else {
      const challenge = await api("/api/auth/challenge", { method: "POST", body: { account } });
      const passwordVerifier = await derivePasswordVerifier(password, challenge.salt, challenge.iterations);
      result = await api("/api/auth/login", {
        method: "POST",
        body: { account, passwordVerifier, passwordLength }
      });
    }
    currentUser = result.user;
    updateAccountUI();
    authDialog.close();
    authForm.reset();
    if (!currentUser.nickname) openNicknameDialog();
    else showToast(mode === "login" ? "登入成功，歡迎回來" : "帳號建立成功");
  } catch (error) {
    showMessage(authMessage, error.message, true);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = mode === "login" ? "登入" : "註冊並繼續";
  }
});

nicknameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(nicknameMessage, "");
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    showMessage(nicknameMessage, "請輸入暱稱。", true);
    nicknameInput.focus();
    return;
  }
  nicknameSubmit.disabled = true;
  nicknameSubmit.textContent = "儲存中…";
  try {
    const result = await api("/api/auth/profile", { method: "POST", body: { nickname } });
    currentUser = result.user;
    updateAccountUI();
    nicknameDialog.close();
    showToast("暱稱已儲存，歡迎來到皇家大廳");
  } catch (error) {
    showMessage(nicknameMessage, error.message, true);
  } finally {
    nicknameSubmit.disabled = false;
    nicknameSubmit.textContent = "儲存暱稱";
  }
});

loadSession();
