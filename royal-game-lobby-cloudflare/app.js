const authDialog = document.querySelector("#auth-dialog");
const nicknameDialog = document.querySelector("#nickname-dialog");
const authButton = document.querySelector("#auth-button");
const userLabel = document.querySelector("#user-label");
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
    userLabel.hidden = false;
    userLabel.textContent = currentUser.nickname || currentUser.username;
  } else {
    authButton.textContent = "登入";
    authButton.setAttribute("aria-label", "登入");
    userLabel.hidden = true;
    userLabel.textContent = "";
  }
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
