皇家遊戲大廳（Cloudflare Pages + D1）

這個版本包含公開大廳、帳號／密碼註冊、登入、首次登入設定暱稱，以及登出。密碼經 PBKDF2-HMAC-SHA-256 雜湊後存入 D1；登入 session token 也只以雜湊值存入資料庫。瀏覽器 cookie 設為 HttpOnly、Secure、SameSite=Lax。

部署步驟
1. Cloudflare Pages 連接此 GitHub 儲存庫，Production branch 選 main。Root directory 填 royal-game-lobby-cloudflare。Build command 填 exit 0。Build output directory 填一個句點。
2. 在 Cloudflare 建立 D1 資料庫，將 migrations/0001_auth.sql 內容貼到資料庫 Console 執行一次。
3. 在 Pages 專案的 Settings → Bindings → Add → D1 database binding，變數名稱填 DB，選取剛建立的資料庫，然後重新部署。
4. 部署完成後，使用 Cloudflare Pages 提供的 pages.dev 網址。

帳號規則
• 帳號：3 至 24 位英文小寫字母、數字、底線或連字號，以英文或數字開頭。
• 密碼：10 至 128 個字元。網站不收集電子郵件，忘記密碼時目前沒有自助重設方式。
• 暱稱：登入後設定，1 至 24 個字。註冊後會自動登入並要求先設定暱稱。

注意
此版本使用 600,000 次 PBKDF2-HMAC-SHA-256 迭代。Cloudflare Workers Free 的 CPU 限制可能不足以執行。若 Cloudflare 要求升級付費方案，請先確認費用；不會未經確認升級。
