# 皇家遊戲大廳（Cloudflare Pages + D1）

這個版本包含公開大廳、帳號／密碼註冊、登入、會員中心、玩家資訊編輯、飛飛幣、商城、每位玩家 100 格的包包、玩家信箱與系統管理後台。玩家可在信箱互寄；全體公告僅能從管理員後台發布。管理後台可搜尋所有玩家並調整序號、帳號、暱稱、地區、民國生日、性別、飛飛幣、大頭照與管理員權限，也可設定新密碼；密碼不會顯示。重設密碼會讓玩家其他裝置登出。所有玩家都會有從 `00000001` 起依序增加的唯一玩家序號。商城先上架尼可（5,000 飛飛幣）；每個商品限購一次，成功後會從餘額扣款並放入玩家包包。新玩家建立帳號時獲得 10,000 元飛飛幣，餘額保存在 D1。登入後可從上方會員中心修改帳號或密碼；修改時須再次輸入目前密碼。修改密碼後，其他裝置的登入工作階段會失效。玩家資訊框位於大廳左上角的首頁按鈕下方。玩家可編輯暱稱、台灣地區、民國生日與性別，也可拖曳並縮放裁切大頭照，照片會壓縮後保存至玩家帳號。暱稱由資料庫唯一性限制避免重複。瀏覽器使用每位玩家獨立 salt，以 PBKDF2-HMAC-SHA-256（600,000 次）處理密碼；伺服器僅接收衍生驗證值，經 SHA-256 再雜湊後存入 D1。登入 session 使用隨機、不透明 token，僅以雜湊值存入資料庫，瀏覽器 cookie 設為 HttpOnly、Secure、SameSite=Lax。

## 部署前設定

1. 把本資料夾上傳到既有 GitHub 儲存庫的 `royal-game-lobby-cloudflare/` 子資料夾，保留目前 GitHub Pages 的舊首頁。連接 Cloudflare Pages 時，Production branch 選 `main`，Root directory 設為 `royal-game-lobby-cloudflare`，Build command 設為 `exit 0`，Build output directory 設為 `.`。
2. 在 Cloudflare 建立 D1 資料庫，將 [`migrations/0001_auth.sql`](migrations/0001_auth.sql) 的 SQL 貼到資料庫 Console 執行一次。
3. 既有網站需在同一個 D1 資料庫執行 [`migrations/0002_player_profile.sql`](migrations/0002_player_profile.sql)，新增個人資料欄位並啟用暱稱唯一限制。
4. 既有網站需在同一個 D1 資料庫執行 [`migrations/0003_player_avatar.sql`](migrations/0003_player_avatar.sql)，新增玩家照片欄位。
5. 既有網站需在同一個 D1 資料庫執行 [`migrations/0004_fly_coins.sql`](migrations/0004_fly_coins.sql)，新增飛飛幣餘額欄位；既有玩家也會獲得 10,000 元初始餘額。
6. 在同一個 D1 資料庫執行 [`migrations/0005_player_inventory.sql`](migrations/0005_player_inventory.sql)，建立玩家包包資料表。
7. 在同一個 D1 資料庫執行 [`migrations/0006_player_mail.sql`](migrations/0006_player_mail.sql)，建立玩家信箱與全體公告資料表，並授予 `afei0217` 管理員公告權限。
8. 在同一個 D1 資料庫執行 [`migrations/0007_player_numbers.sql`](migrations/0007_player_numbers.sql)，依建立時間為既有玩家補上序號，並確保新玩家取得下一個序號。
9. 在 Pages 專案的 **Settings → Bindings → Add → D1 database binding**，設定變數名稱為 `DB`，選取剛建立的資料庫，然後重新部署。
10. 等部署完成後，開啟 Cloudflare Pages 提供的 `*.pages.dev` 網址。

Cloudflare Pages Functions 會從專案根目錄內的 `functions/` 目錄自動部署。使用 Git 整合後，推送新提交會觸發新的部署。

## 帳號規則

- 帳號：1–24 個字，可使用中文、英文、數字和符號；前後空白會移除、文字會做一致化與轉小寫，不能重複，也不能包含控制字元。
- 密碼：10–128 個字元。處理密碼的高成本運算在玩家瀏覽器進行，Cloudflare Function 只執行快速驗證；舊帳號在首次成功登入時會自動轉換儲存格式。網站不會收集電子郵件，所以玩家忘記密碼時沒有自助重設方式。
- 暱稱：登入後設定，1–24 個字，不能與其他玩家重複；玩家可在資訊欄自行修改。
- 註冊後會自動登入並要求先設定暱稱。
- 管理員登入後可從上方「管理後台」搜尋玩家、調整玩家資料與飛飛幣、重設玩家密碼，並發布全體公告。管理員可在後台授予其他帳號管理員權限；不能移除自己或平台最後一位管理員的權限。

## 注意

此版本保留 PBKDF2-HMAC-SHA-256 600,000 次迭代，不把密碼明文傳送給伺服器；高成本運算由瀏覽器執行，避免 Cloudflare Workers Free 每次請求 10 ms CPU 時間限制。
