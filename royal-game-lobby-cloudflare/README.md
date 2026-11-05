皇家遊戲大廳（Cloudflare Pages + D1）

這個版本包含公開大廳、帳號／密碼註冊、登入、設定暱稱，以及登出。密碼以 PBKDF2-HMAC-SHA-256 雜湊後存入 D1；登入 session token 也只以雜湊值存入資料庫。

部署步驟
1. Cloudflare Pages 連接此 GitHub 儲存庫，Production branch 選 main，Root directory 填 royal-game-lobby-cloudflare，Build command 填 exit 0，Build output directory 填一個句點。
2. 在 Cloudflare 建立 D1 資料庫，執行 migrations/0001_auth.sql。
3. 在 Pages 專案 Settings → Bindings → Add → D1 database binding，變數名稱填 DB，選取該資料庫並重新部署。
4. 部署後使用 Cloudflare Pages 提供的 pages.dev 網址。

帳號與密碼
• 帳號：1 至 24 個字，不可空白或包含控制字元；可使用中文、英文、數字和符號。前後空白會移除、大小寫視為相同，帳號不可重複。
• 密碼：10 至 128 個字元。網站不收集電子郵件，忘記密碼時沒有自助重設方式。
• 註冊成功會自動登入，接著設定 1 至 24 個字的暱稱。

注意
此版本使用 600,000 次 PBKDF2-HMAC-SHA-256 迭代。Cloudflare Workers Free 的 CPU 限制可能不足以執行；若 Cloudflare 要求升級付費方案，需先確認費用。
