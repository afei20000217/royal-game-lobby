# 皇家遊戲大廳（Cloudflare Pages + D1）

這個版本包含公開大廳、帳號／密碼註冊、登入、首次登入設定暱稱，以及登出。密碼以每位玩家獨立 salt 的 PBKDF2-HMAC-SHA-256（600,000 次）雜湊後存入 D1；登入 session 使用隨機、不透明 token，僅以雜湊值存入資料庫，瀏覽器 cookie 設為 HttpOnly、Secure、SameSite=Lax。

## 部署前設定

1. Cloudflare Pages 連接此 GitHub 儲存庫時，Production branch 選 [main]，Root directory 設為 [royal-game-lobby-cloudflare]，Build command 設為 [exit 0]，Build output directory 設為 [.]。
2. 在 Cloudflare 建立 D1 資料庫，將 [migrations/0001_auth.sql] 的 SQL 貼到資料庫 Console 執行一次。
3. 在 Pages 專案的 Settings → Bindings → Add → D1 database binding，設定變數名稱為 [DB]，選取剛建立的資料庫，然後重新部署。
4. 等部署完成後，開啟 Cloudflare Pages 提供的 [*.pages.dev] 網址。

Cloudflare Pages Functions 會從專案根目錄內的 [functions/] 目錄自動部署。使用 Git 整合後，推送新提交會觸發新的部署。

## 帳號規則

- 帳號：3–24 位英文小寫字母、數字、底線或連字號，以英文或數字開頭；比對時不分大小寫。
- 密碼：10–128 個字元。網站不會收集電子郵件，所以玩家忘記密碼時沒有自助重設方式。
- 暱稱：登入後設定，1–24 個字。
- 註冊後會自動登入並要求先設定暱稱。

## 注意

此版本使用 PBKDF2-HMAC-SHA-256 600,000 次迭代。Cloudflare Workers Free 每次請求的 CPU 時間限制為 10 ms，而 Pages Functions 共用 Workers 配額；這項安全雜湊可能超過免費限制。若 Cloudflare 要求升級 Workers Paid，請先確認費用；不應在未確認前升級。
