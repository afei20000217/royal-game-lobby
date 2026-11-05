# 皇家遊戲大廳（Cloudflare Pages + D1）

這個版本包含公開大廳、帳號／密碼註冊、登入、首次登入設定暱稱，以及登出。瀏覽器使用每位玩家獨立 salt，以 PBKDF2-HMAC-SHA-256（600,000 次）處理密碼；伺服器僅接收衍生驗證值，經 SHA-256 再雜湊後存入 D1。登入 session 使用隨機、不透明 token，僅以雜湊值存入資料庫，瀏覽器 cookie 設為 HttpOnly、Secure、SameSite=Lax。

## 部署前設定

1. 把本資料夾上傳到既有 GitHub 儲存庫的 `royal-game-lobby-cloudflare/` 子資料夾，保留目前 GitHub Pages 的舊首頁。連接 Cloudflare Pages 時，Production branch 選 `main`，Root directory 設為 `royal-game-lobby-cloudflare`，Build command 設為 `exit 0`，Build output directory 設為 `.`。
2. 在 Cloudflare 建立 D1 資料庫，將 [`migrations/0001_auth.sql`](migrations/0001_auth.sql) 的 SQL 貼到資料庫 Console 執行一次。
3. 在 Pages 專案的 **Settings → Bindings → Add → D1 database binding**，設定變數名稱為 `DB`，選取剛建立的資料庫，然後重新部署。
4. 等部署完成後，開啟 Cloudflare Pages 提供的 `*.pages.dev` 網址。

Cloudflare Pages Functions 會從專案根目錄內的 `functions/` 目錄自動部署。使用 Git 整合後，推送新提交會觸發新的部署。

## 帳號規則

- 帳號：1–24 個字，可使用中文、英文、數字和符號；前後空白會移除、文字會做一致化與轉小寫，不能重複，也不能包含控制字元。
- 密碼：10–128 個字元。處理密碼的高成本運算在玩家瀏覽器進行，Cloudflare Function 只執行快速驗證；舊帳號在首次成功登入時會自動轉換儲存格式。網站不會收集電子郵件，所以玩家忘記密碼時沒有自助重設方式。
- 暱稱：登入後設定，1–24 個字；之後可在使用者資料表由管理員調整。
- 註冊後會自動登入並要求先設定暱稱。

## 注意

此版本保留 PBKDF2-HMAC-SHA-256 600,000 次迭代，不把密碼明文傳送給伺服器；高成本運算由瀏覽器執行，避免 Cloudflare Workers Free 每次請求 10 ms CPU 時間限制。
