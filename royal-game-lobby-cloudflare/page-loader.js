(() => {
  const screen = document.querySelector("[data-page-loader]");
  if (!screen) return;
  const bar = screen.querySelector("[data-loader-bar]");
  const track = screen.querySelector('[role="progressbar"]');
  const percent = screen.querySelector("[data-loader-percent]");
  const caption = screen.querySelector("[data-loader-caption]");
  const page = screen.dataset.page;
  const TRANSITION_KEY = "royal-lobby-page-transition";
  const mark = (value, text) => {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    bar.style.width = `${next}%`;
    percent.textContent = `${next}%`;
    track.setAttribute("aria-valuenow", String(next));
    if (text) caption.textContent = text;
  };
  const show = () => {
    screen.hidden = false;
    screen.setAttribute("aria-hidden", "false");
  };
  const hide = () => {
    screen.setAttribute("aria-hidden", "true");
    screen.hidden = true;
  };
  const go = (url, direction) => {
    try { sessionStorage.setItem(TRANSITION_KEY, direction); } catch {}
    show();
    mark(28, direction === "game" ? "正在開啟山海經…" : "正在返回遊戲大廳…");
    window.setTimeout(() => location.assign(url), 260);
  };

  if (page === "lobby") {
    let transition = "";
    try { transition = sessionStorage.getItem(TRANSITION_KEY) || ""; sessionStorage.removeItem(TRANSITION_KEY); } catch {}
    if (transition !== "lobby") { hide(); return; }
    show(); mark(58, "正在整理大廳畫面…");
    const finish = () => {
      mark(100, "大廳已準備完成");
      window.setTimeout(hide, 180);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    document.querySelectorAll('a[href="/games/shanhaijing/"]').forEach(link => {
      link.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        go(link.href, "game");
      });
    });
    return;
  }

  let transition = "";
  try { transition = sessionStorage.getItem(TRANSITION_KEY) || ""; sessionStorage.removeItem(TRANSITION_KEY); } catch {}
  show(); mark(18, "正在準備遊戲畫面…");
  const startedAt = performance.now();
  document.addEventListener("DOMContentLoaded", () => mark(38, "遊戲介面已載入，正在準備美術資源…"), { once: true });
  const finish = async () => {
    mark(72, "正在解碼遊戲圖像…");
    try { await window.gameAssetsReady; } catch {}
    mark(94, "遊戲即將開始…");
    const minimum = transition === "game" ? 520 : 260;
    const remaining = Math.max(0, minimum - (performance.now() - startedAt));
    window.setTimeout(() => { mark(100, "載入完成"); window.setTimeout(hide, 180); }, remaining);
  };
  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish, { once: true });
  document.querySelectorAll(".lobby-return").forEach(link => {
    link.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      go(link.href, "lobby");
    });
  });
})();
