const authDialog = document.querySelector("#auth-dialog");
const nicknameDialog = document.querySelector("#nickname-dialog");
const profileDialog = document.querySelector("#profile-dialog");
const playerWidget = document.querySelector("#player-widget");
const authButton = document.querySelector("#auth-button");
const memberCenterButton = document.querySelector("#member-center-button");
const memberCenterDialog = document.querySelector("#member-center-dialog");
const changeAccountForm = document.querySelector("#change-account-form");
const changePasswordForm = document.querySelector("#change-password-form");
const currencyDisplay = document.querySelector("#currency-display");
const currencyAmount = document.querySelector("#currency-amount");
const userLabel = document.querySelector("#user-label");
const playerName = document.querySelector("#player-name");
const playerAvatarSmall = document.querySelector("#player-avatar-small");
const profileAvatar = document.querySelector("#profile-avatar");
const avatarChange = document.querySelector("#avatar-change");
const avatarRemove = document.querySelector("#avatar-remove");
const avatarFile = document.querySelector("#avatar-file");
const avatarCropDialog = document.querySelector("#avatar-crop-dialog");
const avatarCropViewport = document.querySelector("#avatar-crop-viewport");
const avatarCropCanvas = document.querySelector("#avatar-crop-canvas");
const avatarZoom = document.querySelector("#avatar-zoom");
const avatarCropSave = document.querySelector("#avatar-crop-save");
const avatarCropMessage = document.querySelector("#avatar-crop-message");
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
let cropBitmap = null;
let cropZoom = 1;
let cropPanX = 0;
let cropPanY = 0;
let cropPointer = null;
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
    currencyDisplay.hidden = false;
    currencyAmount.textContent = formatCurrency(currentUser.flyCoins);
    memberCenterButton.hidden = false;
    document.querySelector("#member-account-value").textContent = currentUser.username;
  } else {
    authButton.textContent = "登入";
    authButton.setAttribute("aria-label", "登入");
    userLabel.hidden = true;
    userLabel.textContent = "";
    playerName.textContent = "訪客玩家";
    currencyDisplay.hidden = true;
    memberCenterButton.hidden = true;
    memberCenterDialog.close();
  }
  const avatar = currentUser?.avatar || "";
  if (avatar) {
    playerAvatarSmall.src = avatar;
    profileAvatar.src = avatar;
  } else {
    playerAvatarSmall.removeAttribute("src");
    profileAvatar.removeAttribute("src");
  }
  updateProfileUI();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("zh-TW").format(Number(amount ?? 0));
}

function updateProfileUI() {
  profileNickname.textContent = currentUser?.nickname || (currentUser ? "尚未設定暱稱" : "訪客玩家");
  profileAccount.textContent = currentUser ? `帳號：${currentUser.username}` : "訪客模式";
  profileJoined.textContent = currentUser?.createdAt
    ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(new Date(Number(currentUser.createdAt) * 1000))
    : currentUser ? "資料尚未提供" : "登入後顯示";
  document.querySelector("#profile-fly-coins").textContent = currentUser ? `${formatCurrency(currentUser.flyCoins)} 元` : "登入後顯示";
  profileLogin.hidden = Boolean(currentUser);
  avatarChange.hidden = !currentUser;
  avatarRemove.hidden = !currentUser || !currentUser.avatar;
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
memberCenterButton.addEventListener("click", () => {
  if (!currentUser) return;
  changeAccountForm.reset();
  changePasswordForm.reset();
  changeAccountForm.hidden = true;
  changePasswordForm.hidden = true;
  memberCenterDialog.querySelectorAll(".form-message").forEach((message) => { message.textContent = ""; message.classList.remove("error"); });
  memberCenterDialog.showModal();
});
document.querySelectorAll("[data-member-edit]").forEach((button) => button.addEventListener("click", () => {
  const type = button.dataset.memberEdit;
  const form = type === "account" ? changeAccountForm : changePasswordForm;
  const otherForm = type === "account" ? changePasswordForm : changeAccountForm;
  otherForm.hidden = true;
  otherForm.reset();
  otherForm.querySelector(".form-message").textContent = "";
  otherForm.querySelector(".form-message").classList.remove("error");
  form.hidden = false;
  form.querySelector(".form-message").textContent = "";
  form.querySelector(".form-message").classList.remove("error");
  if (type === "account") form.elements.newAccount.value = currentUser.username;
  form.querySelector('[name="currentPassword"]').focus();
}));
document.querySelectorAll("[data-member-cancel]").forEach((button) => button.addEventListener("click", () => {
  const form = button.dataset.memberCancel === "account" ? changeAccountForm : changePasswordForm;
  form.reset();
  form.hidden = true;
  form.querySelector(".form-message").textContent = "";
  form.querySelector(".form-message").classList.remove("error");
}));
profileLogin.addEventListener("click", () => {
  profileDialog.close();
  openAuth("login");
});
avatarChange.addEventListener("click", () => avatarFile.click());
avatarFile.addEventListener("change", async () => {
  const file = avatarFile.files?.[0];
  avatarFile.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
    showToast("請選擇 12 MB 以內的圖片。");
    return;
  }
  try {
    if (cropBitmap) cropBitmap.close();
    cropBitmap = await createImageBitmap(file);
    cropZoom = 1;
    cropPanX = 0;
    cropPanY = 0;
    avatarZoom.value = "100";
    showMessage(avatarCropMessage, "");
    avatarCropDialog.showModal();
    requestAnimationFrame(renderAvatarCrop);
  } catch (error) {
    showToast(error.message || "無法讀取這張圖片，請換一張再試。");
  }
});
function renderAvatarCrop() {
  if (!cropBitmap) return;
  const view = avatarCropViewport.clientWidth;
  const cover = Math.max(view / cropBitmap.width, view / cropBitmap.height);
  const scale = cover * cropZoom;
  const width = cropBitmap.width * scale;
  const height = cropBitmap.height * scale;
  cropPanX = Math.max(-(width - view) / 2, Math.min((width - view) / 2, cropPanX));
  cropPanY = Math.max(-(height - view) / 2, Math.min((height - view) / 2, cropPanY));
  const ratio = avatarCropCanvas.width / view;
  const context = avatarCropCanvas.getContext("2d");
  context.clearRect(0, 0, avatarCropCanvas.width, avatarCropCanvas.height);
  context.drawImage(cropBitmap, ((view - width) / 2 + cropPanX) * ratio, ((view - height) / 2 + cropPanY) * ratio, width * ratio, height * ratio);
}
function setAvatarZoom(value) {
  cropZoom = Math.max(1, Math.min(3, value));
  avatarZoom.value = String(Math.round(cropZoom * 100));
  renderAvatarCrop();
}
avatarZoom.addEventListener("input", () => setAvatarZoom(Number(avatarZoom.value) / 100));
avatarCropViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  setAvatarZoom(cropZoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });
avatarCropViewport.addEventListener("pointerdown", (event) => {
  cropPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  avatarCropViewport.setPointerCapture(event.pointerId);
  avatarCropViewport.classList.add("dragging");
});
avatarCropViewport.addEventListener("pointermove", (event) => {
  if (!cropPointer || cropPointer.id !== event.pointerId) return;
  cropPanX += event.clientX - cropPointer.x;
  cropPanY += event.clientY - cropPointer.y;
  cropPointer.x = event.clientX;
  cropPointer.y = event.clientY;
  renderAvatarCrop();
});
function stopAvatarCropDrag() { cropPointer = null; avatarCropViewport.classList.remove("dragging"); }
avatarCropViewport.addEventListener("pointerup", stopAvatarCropDrag);
avatarCropViewport.addEventListener("pointercancel", stopAvatarCropDrag);
avatarCropViewport.addEventListener("lostpointercapture", stopAvatarCropDrag);
avatarCropDialog.addEventListener("close", () => {
  if (cropBitmap) cropBitmap.close();
  cropBitmap = null;
  cropPointer = null;
  const context = avatarCropCanvas.getContext("2d");
  context.clearRect(0, 0, avatarCropCanvas.width, avatarCropCanvas.height);
});
document.querySelector("#avatar-crop-cancel").addEventListener("click", () => avatarCropDialog.close());
avatarCropSave.addEventListener("click", async () => {
  if (!cropBitmap) return;
  avatarCropSave.disabled = true;
  showMessage(avatarCropMessage, "正在保存照片…");
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const view = avatarCropViewport.clientWidth;
    const scale = Math.max(256 / cropBitmap.width, 256 / cropBitmap.height) * cropZoom;
    const width = cropBitmap.width * scale;
    const height = cropBitmap.height * scale;
    const ratio = 256 / view;
    const left = (256 - width) / 2 + cropPanX * ratio;
    const top = (256 - height) / 2 + cropPanY * ratio;
    canvas.getContext("2d").drawImage(cropBitmap, left, top, width, height);
    let avatar = canvas.toDataURL("image/webp", 0.82);
    if (!avatar.startsWith("data:image/webp;")) avatar = canvas.toDataURL("image/jpeg", 0.82);
    if (avatar.length > 380_000) avatar = canvas.toDataURL("image/jpeg", 0.62);
    if (avatar.length > 380_000) throw new Error("照片檔案仍太大，請縮小後再試。");
    const result = await api("/api/auth/profile", { method: "POST", body: { field: "avatar", value: avatar } });
    currentUser = result.user;
    updateAccountUI();
    avatarCropDialog.close();
    showToast("大頭照已更新");
  } catch (error) {
    showMessage(avatarCropMessage, error.message || "照片儲存失敗，請再試一次。", true);
  } finally {
    avatarCropSave.disabled = false;
  }
});
avatarRemove.addEventListener("click", async () => {
  avatarRemove.disabled = true;
  try {
    const result = await api("/api/auth/profile", { method: "POST", body: { field: "avatar", value: null } });
    currentUser = result.user;
    updateAccountUI();
    showToast("已移除大頭照");
  } catch (error) {
    showToast(error.message);
  } finally { avatarRemove.disabled = false; }
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

async function verifyCurrentPassword(password) {
  const passwordLength = Array.from(password).length;
  if (passwordLength < 10 || passwordLength > 128) throw new Error("請輸入正確的目前密碼。");
  const challenge = await api("/api/auth/challenge", { method: "POST", body: { account: currentUser.username } });
  return { passwordLength, passwordVerifier: await derivePasswordVerifier(password, challenge.salt, challenge.iterations) };
}

async function submitCredentialChange(form, type) {
  const message = form.querySelector(".form-message");
  const submit = form.querySelector('[type="submit"]');
  message.textContent = "";
  message.classList.remove("error");
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const currentPassword = String(values.get("currentPassword") || "");
  const change = { type, ...(await verifyCurrentPassword(currentPassword)) };
  if (type === "account") {
    change.newAccount = String(values.get("newAccount") || "").trim();
  } else {
    const newPassword = String(values.get("newPassword") || "");
    const confirmPassword = String(values.get("confirmNewPassword") || "");
    if (newPassword !== confirmPassword) throw new Error("兩次輸入的新密碼不一致。");
    const newPasswordLength = Array.from(newPassword).length;
    if (newPasswordLength < 10 || newPasswordLength > 128) throw new Error("新密碼需為 10–128 個字元。");
    change.newSalt = randomSalt();
    change.newPasswordLength = newPasswordLength;
    change.newPasswordVerifier = await derivePasswordVerifier(newPassword, change.newSalt);
  }
  submit.disabled = true;
  submit.textContent = "安全儲存中…";
  try {
    const result = await api("/api/auth/credentials", { method: "POST", body: change });
    currentUser = result.user;
    updateAccountUI();
    form.reset();
    form.hidden = true;
    showToast(type === "account" ? "帳號已更新" : "密碼已更新" + (result.sessionsRevoked ? "，其他登入裝置已登出" : ""));
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  } finally {
    submit.disabled = false;
    submit.textContent = type === "account" ? "儲存新帳號" : "儲存新密碼";
  }
}

changeAccountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await submitCredentialChange(changeAccountForm, "account"); }
  catch (error) { const message = changeAccountForm.querySelector(".form-message"); message.textContent = error.message; message.classList.add("error"); }
});
changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await submitCredentialChange(changePasswordForm, "password"); }
  catch (error) { const message = changePasswordForm.querySelector(".form-message"); message.textContent = error.message; message.classList.add("error"); }
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
