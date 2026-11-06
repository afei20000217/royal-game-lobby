const authDialog = document.querySelector("#auth-dialog");
const nicknameDialog = document.querySelector("#nickname-dialog");
const profileDialog = document.querySelector("#profile-dialog");
const playerWidget = document.querySelector("#player-widget");
const authButton = document.querySelector("#auth-button");
const memberCenterButton = document.querySelector("#member-center-button");
const memberCenterDialog = document.querySelector("#member-center-dialog");
const shopDialog = document.querySelector("#shop-dialog");
const bagDialog = document.querySelector("#bag-dialog");
const shopButton = document.querySelector("#shop-button");
const bagButton = document.querySelector("#bag-button");
const mailButton = document.querySelector("#mail-button");
const adminButton = document.querySelector("#admin-button");
const mailUnread = document.querySelector("#mail-unread");
const mailDialog = document.querySelector("#mail-dialog");
const mailWorkspace = document.querySelector("#mail-workspace");
const mailList = document.querySelector("#mail-list");
const mailReader = document.querySelector("#mail-reader");
const mailStatus = document.querySelector("#mail-status");
const mailComposeForm = document.querySelector("#mail-compose-form");
const adminDialog = document.querySelector("#admin-dialog");
const adminStatus = document.querySelector("#admin-status");
const adminPlayersView = document.querySelector("#admin-players-view");
const adminBroadcastForm = document.querySelector("#admin-broadcast-form");
const adminSearchForm = document.querySelector("#admin-search-form");
const adminSearch = document.querySelector("#admin-search");
const adminPlayerRows = document.querySelector("#admin-player-rows");
const adminPlayerForm = document.querySelector("#admin-player-form");
const adminPlayerCount = document.querySelector("#admin-player-count");
const adminPageLabel = document.querySelector("#admin-page-label");
const adminAvatarPreview = document.querySelector("#admin-avatar-preview");
const adminAvatarNote = document.querySelector("#admin-avatar-note");
const buyNikoButton = document.querySelector("#buy-niko-button");
const shopMessage = document.querySelector("#shop-message");
const bagItemsElement = document.querySelector("#bag-items");
const bagEmptyElement = document.querySelector("#bag-empty");
const bagSlotsElement = document.querySelector("#bag-slots");
const bagCountElement = document.querySelector("#bag-count");
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
let inventoryItems = [];
let activeMailView = "inbox";
let activeMailItems = [];
let adminPlayerPage = 1;
let adminPlayerTotal = 0;
let selectedAdminPlayerId = null;
const BAG_CAPACITY = 100;
const ITEM_DETAILS = {
  "niko-cat": { name: "尼可", image: "/game-art/niko.jpg", description: "把尼可帶回包包收藏吧。" }
};
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
    adminButton.hidden = !currentUser.isAdmin;
    document.querySelector("#member-account-value").textContent = currentUser.username;
  } else {
    authButton.textContent = "登入";
    authButton.setAttribute("aria-label", "登入");
    userLabel.hidden = true;
    userLabel.textContent = "";
    playerName.textContent = "訪客玩家";
    currencyDisplay.hidden = true;
    memberCenterButton.hidden = true;
    adminButton.hidden = true;
    memberCenterDialog.close();
    mailDialog.close();
    mailUnread.hidden = true;
    mailUnread.textContent = "0";
    adminDialog.close();
    inventoryItems = [];
    updateBagUI();
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

function updateBagUI() {
  const used = Math.min(inventoryItems.length, BAG_CAPACITY);
  bagCountElement.textContent = `${used}/${BAG_CAPACITY}`;
  bagSlotsElement.textContent = `${used} / ${BAG_CAPACITY}`;
  bagItemsElement.replaceChildren();
  bagEmptyElement.textContent = "包包還是空的，去商城看看吧。";
  for (let index = 0; index < BAG_CAPACITY; index += 1) {
    const item = inventoryItems[index];
    const slot = document.createElement("div");
    slot.className = item ? "bag-slot bag-slot-filled" : "bag-slot bag-slot-empty";
    slot.setAttribute("aria-label", item ? ITEM_DETAILS[item.item_id]?.name || "收藏品" : `空格 ${index + 1}`);
    if (item) {
      const details = ITEM_DETAILS[item.item_id] || { name: "收藏品", image: "", description: "" };
      slot.title = details.name;
      if (details.image) {
      const image = document.createElement("img");
      image.src = details.image;
      image.alt = details.name;
        slot.append(image);
      }
    }
    bagItemsElement.append(slot);
  }
  bagEmptyElement.hidden = inventoryItems.length > 0;
}

function updateShopUI() {
  const ownsNiko = inventoryItems.some((item) => item.item_id === "niko-cat");
  buyNikoButton.disabled = ownsNiko;
  buyNikoButton.textContent = ownsNiko ? "已放入包包" : currentUser ? "購買尼可" : "登入後購買";
}

async function refreshInventory() {
  if (!currentUser) {
    inventoryItems = [];
    updateBagUI();
    updateShopUI();
    return;
  }
  const result = await api("/api/auth/inventory");
  inventoryItems = Array.isArray(result.items) ? result.items : [];
  updateBagUI();
  updateShopUI();
}

async function openShop() {
  showMessage(shopMessage, "");
  updateShopUI();
  shopDialog.showModal();
  if (currentUser) {
    try { await refreshInventory(); }
    catch (error) { showMessage(shopMessage, error.message, true); }
  }
}

async function openBag() {
  if (!currentUser) {
    openAuth("login");
    return;
  }
  bagEmptyElement.hidden = true;
  bagItemsElement.replaceChildren();
  bagEmptyElement.textContent = "包包載入中…";
  bagDialog.showModal();
  try { await refreshInventory(); }
  catch (error) {
    bagEmptyElement.hidden = false;
    bagEmptyElement.textContent = error.message;
  }
}

function updateMailUnread(count) {
  const unread = Math.max(0, Number(count || 0));
  mailUnread.textContent = unread > 99 ? "99+" : String(unread);
  mailUnread.hidden = !currentUser || unread === 0;
}

function formatMailDate(timestamp) {
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "short" })
    .format(new Date(Number(timestamp) * 1000));
}

function renderMailReader(item) {
  mailReader.replaceChildren();
  const meta = document.createElement("div");
  meta.className = "mail-reader-meta";
  const subject = document.createElement("h3");
  subject.className = "mail-reader-title";
  subject.textContent = item.subject;
  const sender = document.createElement("span");
  sender.className = "mail-reader-line";
  sender.textContent = `寄件者：${item.senderName}`;
  const recipient = document.createElement("span");
  recipient.className = "mail-reader-line";
  recipient.textContent = `收件者：${item.recipientName}`;
  const date = document.createElement("span");
  date.className = "mail-reader-line";
  date.textContent = formatMailDate(item.createdAt);
  meta.append(subject, sender, recipient, date);
  const body = document.createElement("p");
  body.className = "mail-reader-body";
  body.textContent = item.body;
  mailReader.append(meta, body);
}

function renderMailList(items) {
  mailList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "mail-list-empty";
    empty.textContent = activeMailView === "sent" ? "目前沒有寄出的信件。" : "目前沒有信件或系統公告。";
    mailList.append(empty);
    mailReader.innerHTML = '<p class="mail-reader-empty">選擇一封信件閱讀內容。</p>';
    return;
  }
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mail-row";
    if (activeMailView === "inbox" && !item.isRead) button.classList.add("unread");
    const sender = document.createElement("span");
    sender.className = "mail-row-sender";
    sender.textContent = `${item.type === "system" ? "系統公告" : activeMailView === "sent" ? `寄給 ${item.recipientName}` : `來自 ${item.senderName}`}`;
    const subject = document.createElement("span");
    subject.className = "mail-row-subject";
    subject.textContent = item.subject;
    const date = document.createElement("span");
    date.className = "mail-row-date";
    date.textContent = formatMailDate(item.createdAt);
    button.append(sender, subject, date);
    button.addEventListener("click", () => openMailItem(item, button));
    mailList.append(button);
  }
  mailReader.innerHTML = '<p class="mail-reader-empty">選擇一封信件閱讀內容。</p>';
}

async function openMailItem(item, selectedButton) {
  if (activeMailView === "inbox" && !item.isRead) {
    try {
      const result = await api("/api/auth/mail/read", { method: "POST", body: { type: item.type, id: item.id } });
      item.isRead = true;
      selectedButton.classList.remove("unread");
      updateMailUnread(result.unread);
    } catch (error) {
      showMessage(mailStatus, error.message, true);
    }
  }
  mailList.querySelectorAll(".mail-row").forEach((row) => row.removeAttribute("aria-current"));
  selectedButton.setAttribute("aria-current", "true");
  renderMailReader(item);
}

async function loadMail(view) {
  activeMailView = view;
  document.querySelectorAll("[data-mail-view]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.mailView === view));
  });
  const isList = view === "inbox" || view === "sent";
  mailWorkspace.hidden = !isList;
  mailComposeForm.hidden = view !== "compose";
  showMessage(mailStatus, "");
  if (!isList) {
    if (view === "compose") mailComposeForm.elements.recipient.focus();
    return;
  }
  mailList.replaceChildren();
  mailReader.innerHTML = '<p class="mail-reader-empty">信件載入中…</p>';
  try {
    const result = await api(`/api/auth/mail/${view}`);
    activeMailItems = Array.isArray(result.items) ? result.items : [];
    updateMailUnread(result.unread);
    renderMailList(activeMailItems);
  } catch (error) {
    mailList.replaceChildren();
    mailReader.innerHTML = '<p class="mail-reader-empty">無法載入信件。</p>';
    showMessage(mailStatus, error.message, true);
  }
}

async function openMail() {
  if (!currentUser) {
    openAuth("login");
    return;
  }
  mailDialog.showModal();
  await loadMail("inbox");
}

async function refreshMailBadge() {
  if (!currentUser) return;
  try {
    const result = await api("/api/auth/mail/inbox");
    updateMailUnread(result.unread);
  } catch { /* Keep the lobby usable when mailbox refresh is temporarily unavailable. */ }
}

function populateAdminBirthdaySelects() {
  const form = adminPlayerForm;
  if (form.elements.region.options.length === 1) regions.forEach((region) => form.elements.region.add(option(region)));
  if (form.elements.year.options.length === 1) {
    for (let year = 80; year <= Number(rocYear); year += 1) form.elements.year.add(option(year, `民國${year}年`));
    for (let month = 1; month <= 12; month += 1) form.elements.month.add(option(month, `${month}月`));
  }
}

function refreshAdminBirthdayDays(selected = "") {
  const year = Number(adminPlayerForm.elements.year.value || rocYear) + 1911;
  const month = Number(adminPlayerForm.elements.month.value || 1);
  const days = new Date(year, month, 0).getDate();
  adminPlayerForm.elements.day.replaceChildren(option("", "--"));
  for (let day = 1; day <= days; day += 1) adminPlayerForm.elements.day.add(option(day, `${day}日`));
  if (selected && Number(selected) <= days) adminPlayerForm.elements.day.value = selected;
}

function setAdminView(view) {
  if (!currentUser?.isAdmin) return;
  document.querySelectorAll("[data-admin-view]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.adminView === view));
  });
  adminPlayersView.hidden = view !== "players";
  adminBroadcastForm.hidden = view !== "broadcast";
  showMessage(adminStatus, "");
  if (view === "players") loadAdminPlayers();
  else adminBroadcastForm.elements.subject.focus();
}

async function openAdmin() {
  if (!currentUser?.isAdmin) return;
  adminDialog.showModal();
  populateAdminBirthdaySelects();
  adminPlayerForm.hidden = true;
  selectedAdminPlayerId = null;
  adminSearch.value = "";
  adminPlayerPage = 1;
  setAdminView("players");
}

async function loadAdminPlayers() {
  if (!currentUser?.isAdmin) return;
  adminPlayerRows.replaceChildren();
  const loading = document.createElement("tr");
  const loadingCell = document.createElement("td");
  loadingCell.colSpan = 4;
  loadingCell.textContent = "載入玩家資料…";
  loading.append(loadingCell);
  adminPlayerRows.append(loading);
  try {
    const params = new URLSearchParams({ q: adminSearch.value.trim(), page: String(adminPlayerPage) });
    const result = await api(`/api/auth/admin/players?${params}`);
    adminPlayerTotal = result.total;
    adminPlayerRows.replaceChildren();
    adminPlayerCount.textContent = `共 ${formatCurrency(adminPlayerTotal)} 位玩家`;
    const pageCount = Math.max(1, Math.ceil(adminPlayerTotal / result.pageSize));
    adminPageLabel.textContent = `第 ${result.page} / ${pageCount} 頁`;
    document.querySelector("#admin-prev").disabled = result.page <= 1;
    document.querySelector("#admin-next").disabled = result.page >= pageCount;
    if (!result.players.length) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 4;
      emptyCell.textContent = "沒有符合的玩家資料。";
      emptyRow.append(emptyCell);
      adminPlayerRows.append(emptyRow);
      return;
    }
    for (const player of result.players) {
      const row = document.createElement("tr");
      row.className = "admin-player-row";
      row.tabIndex = 0;
      row.setAttribute("aria-label", `編輯玩家 ${String(player.player_number).padStart(8, "0")} ${player.username}`);
      const number = document.createElement("td");
      number.textContent = String(player.player_number).padStart(8, "0");
      const identity = document.createElement("td");
      const account = document.createElement("strong");
      account.textContent = player.username;
      const nickname = document.createElement("small");
      nickname.textContent = player.nickname || "未設定暱稱";
      identity.append(account, nickname);
      const region = document.createElement("td");
      region.textContent = player.region || "—";
      const coins = document.createElement("td");
      coins.textContent = formatCurrency(player.fly_coins);
      row.append(number, identity, region, coins);
      row.addEventListener("click", () => loadAdminPlayer(player.id));
      row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); loadAdminPlayer(player.id); } });
      adminPlayerRows.append(row);
    }
    if (selectedAdminPlayerId && result.players.some((player) => player.id === selectedAdminPlayerId)) {
      adminPlayerRows.querySelectorAll(".admin-player-row").forEach((row, index) => {
        if (result.players[index]?.id === selectedAdminPlayerId) row.classList.add("selected");
      });
    }
  } catch (error) {
    adminPlayerRows.replaceChildren();
    showMessage(adminStatus, error.message, true);
  }
}

async function loadAdminPlayer(id) {
  try {
    const { player } = await api(`/api/auth/admin/player?id=${encodeURIComponent(id)}`);
    selectedAdminPlayerId = player.id;
    const form = adminPlayerForm;
    form.elements.id.value = player.id;
    form.elements.playerNumber.value = player.playerNumber;
    form.elements.account.value = player.username;
    form.elements.nickname.value = player.nickname || "";
    form.elements.region.value = player.region || "";
    form.elements.year.value = player.birthday?.year || "";
    form.elements.month.value = player.birthday?.month || "";
    refreshAdminBirthdayDays(player.birthday?.day || "");
    form.elements.gender.value = player.gender || "";
    form.elements.flyCoins.value = player.flyCoins;
    form.elements.isAdmin.checked = player.isAdmin;
    form.elements.removeAvatar.checked = false;
    adminAvatarPreview.hidden = !player.avatar;
    if (player.avatar) adminAvatarPreview.src = player.avatar;
    else adminAvatarPreview.removeAttribute("src");
    adminAvatarNote.textContent = player.avatar ? "目前已設定大頭照" : "尚無大頭照";
    adminPlayerForm.querySelector(".admin-player-meta").textContent = `加入時間：${new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(player.createdAt * 1000))}`;
    adminPlayerForm.hidden = false;
    showMessage(adminStatus, "");
    adminPlayerRows.querySelectorAll(".admin-player-row").forEach((row) => row.classList.toggle("selected", row.cells[0]?.textContent === player.playerNumber));
  } catch (error) {
    showMessage(adminStatus, error.message, true);
  }
}

function updateProfileUI() {
  profileNickname.textContent = currentUser?.nickname || (currentUser ? "尚未設定暱稱" : "訪客玩家");
  profileAccount.textContent = currentUser ? `玩家序號：${currentUser.playerNumber}　帳號：${currentUser.username}` : "訪客模式";
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
    if (currentUser) {
      refreshInventory().catch(() => {});
      refreshMailBadge().catch(() => {});
    }
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

shopButton.addEventListener("click", openShop);
bagButton.addEventListener("click", openBag);
mailButton.addEventListener("click", openMail);
adminButton.addEventListener("click", openAdmin);
document.querySelectorAll("[data-mail-view]").forEach((button) => button.addEventListener("click", () => {
  loadMail(button.dataset.mailView);
}));
document.querySelectorAll("[data-admin-view]").forEach((button) => button.addEventListener("click", () => setAdminView(button.dataset.adminView)));
mailComposeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = mailComposeForm.querySelector('[type="submit"]');
  button.disabled = true;
  showMessage(mailStatus, "");
  try {
    await api("/api/auth/mail/send", { method: "POST", body: {
      recipient: mailComposeForm.elements.recipient.value,
      subject: mailComposeForm.elements.subject.value,
      body: mailComposeForm.elements.body.value
    } });
    mailComposeForm.reset();
    showMessage(mailStatus, "信件已寄出。");
    await loadMail("sent");
    showMessage(mailStatus, "信件已寄出。");
  } catch (error) {
    showMessage(mailStatus, error.message, true);
  } finally {
    button.disabled = false;
  }
});
adminSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  adminPlayerPage = 1;
  selectedAdminPlayerId = null;
  adminPlayerForm.hidden = true;
  loadAdminPlayers();
});
document.querySelector("#admin-prev").addEventListener("click", () => {
  if (adminPlayerPage > 1) { adminPlayerPage -= 1; loadAdminPlayers(); }
});
document.querySelector("#admin-next").addEventListener("click", () => {
  if (adminPlayerPage * 50 < adminPlayerTotal) { adminPlayerPage += 1; loadAdminPlayers(); }
});
adminPlayerForm.elements.year.addEventListener("change", () => refreshAdminBirthdayDays());
adminPlayerForm.elements.month.addEventListener("change", () => refreshAdminBirthdayDays());
adminPlayerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = adminPlayerForm.querySelector('[type="submit"]');
  button.disabled = true;
  showMessage(adminStatus, "");
  try {
    const form = adminPlayerForm.elements;
    const result = await api("/api/auth/admin/player/update", { method: "POST", body: {
      id: form.id.value,
      account: form.account.value,
      nickname: form.nickname.value,
      region: form.region.value,
      year: form.year.value,
      month: form.month.value,
      day: form.day.value,
      gender: form.gender.value,
      flyCoins: Number(form.flyCoins.value),
      isAdmin: form.isAdmin.checked,
      removeAvatar: form.removeAvatar.checked
    } });
    if (currentUser.id === result.player.id) {
      currentUser = result.player;
      updateAccountUI();
    }
    showMessage(adminStatus, "玩家資料已更新。");
    await loadAdminPlayers();
    await loadAdminPlayer(result.player.id);
    showMessage(adminStatus, "玩家資料已更新。");
  } catch (error) {
    showMessage(adminStatus, error.message, true);
  } finally {
    button.disabled = false;
  }
});
adminBroadcastForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser?.isAdmin || !confirm("這則公告會寄到所有玩家的收件匣，確定發布嗎？")) return;
  const button = adminBroadcastForm.querySelector('[type="submit"]');
  button.disabled = true;
  showMessage(adminStatus, "");
  try {
    await api("/api/auth/mail/broadcast", { method: "POST", body: {
      subject: adminBroadcastForm.elements.subject.value,
      body: adminBroadcastForm.elements.body.value
    } });
    adminBroadcastForm.reset();
    showMessage(adminStatus, "全體公告已發布到玩家信箱。");
    refreshMailBadge().catch(() => {});
  } catch (error) {
    showMessage(adminStatus, error.message, true);
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#bag-shop-button").addEventListener("click", () => {
  bagDialog.close();
  openShop();
});
buyNikoButton.addEventListener("click", async () => {
  if (!currentUser) {
    shopDialog.close();
    openAuth("login");
    return;
  }
  buyNikoButton.disabled = true;
  buyNikoButton.textContent = "購買中…";
  showMessage(shopMessage, "");
  try {
    const result = await api("/api/auth/purchase", { method: "POST", body: { itemId: "niko-cat" } });
    currentUser = result.user;
    inventoryItems = Array.isArray(result.items) ? result.items : [];
    updateAccountUI();
    updateBagUI();
    updateShopUI();
    showMessage(shopMessage, "購買成功，尼可已放進你的包包。");
  } catch (error) {
    showMessage(shopMessage, error.message, true);
    updateShopUI();
  }
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
    refreshInventory().catch(() => {});
    refreshMailBadge().catch(() => {});
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
