# 發音代理（Cloudflare Worker）部署說明

把 Google TTS 金鑰藏到 Cloudflare Worker，前端只透過代理呼叫，金鑰不再出現在網頁原始碼。
代理用「**來源網域（Origin）**」保護：**只接受來自你網站的請求**，使用者不必輸入任何通行碼，但別人也無法拿你的代理亂用。

## 你需要準備

- 一個 Cloudflare 帳號（免費即可）
- 你的 Google Text-to-Speech 金鑰
- 你的網站來源網址（GitHub Pages 通常是 `https://你的帳號.github.io`）

---

## 步驟一：建立 Worker

1. 登入 Cloudflare → 左側 **Workers & Pages** → **Create** → **Create Worker** → 選 **Start with Hello World**（不要選匯入 Git）。
2. 取名例如 `toeic-tts`，按 **Deploy**。
3. 部署後會得到一個網址，例如：`https://toeic-tts.你的子網域.workers.dev`，**記下來**。

## 步驟二：貼上代理程式碼

1. 進入該 Worker → **Edit code**。
2. 把編輯器內容整個換成本資料夾的 `worker.js` 內容，按 **Deploy**。

## 步驟三：設定環境變數

在 Worker 的 **Settings → Variables and Secrets** 設定：

| 名稱 | 類型 | 值 |
| --- | --- | --- |
| `GOOGLE_API_KEY` | **Secret** | 你的 Google TTS 金鑰 |
| `ALLOWED_ORIGIN` | 一般變數（Plaintext）| 你的網站來源；可多個用逗號分隔 |

`ALLOWED_ORIGIN` 範例（同時允許正式站與本機測試）：

```
https://jzx0930.github.io,http://localhost:8000
```

> 注意：Origin 只包含「協定 + 網域」，**不含路徑**。所以即使網站在 `/TOEIC/` 子路徑，這裡也只填到 `https://jzx0930.github.io`。
> 若 `ALLOWED_ORIGIN` 留空＝不限制來源（公開時不建議）。

設定完按 **Deploy / Save**。

## 步驟四：把代理網址填進前端

打開 `index.html`，找到：

```js
const TTS_PROXY_URL = "https://toeic-tts.YOUR-SUBDOMAIN.workers.dev";
```

換成你自己的 Worker 網址，存檔。

## 步驟五：鎖緊 Google 金鑰（建議）

到 Google Cloud Console → 憑證 → 你的金鑰：

- **應用程式限制**：選 **無（None）**。（金鑰由 Worker 在伺服器端呼叫，不帶瀏覽器 referer，所以「網站」限制反而會擋掉 Worker。）
- **API 限制**：只勾 **Cloud Text-to-Speech API**。
- 另建議在 Google 設**用量上限**，當作萬一的保險。

---

## 運作方式

- 你網站上的頁面呼叫代理時，瀏覽器會自動帶上 `Origin: https://你的網域`，代理比對通過才會幫你呼叫 Google。
- 別的網站或一般人直接打你的代理，Origin 不符 → 被擋（回 403）。
- 「🔁 重複」與「🔁 循環播放區塊」用的是瀏覽器免費內建語音，**不經過代理、也不耗 Google 額度**。只有單次發音（🇬🇧/🇺🇸）、測驗唸答案、側欄 🔊 會走代理。

## 注意（誠實說明）

- Origin 保護擋得住「其他網站」與「一般使用者」，但**無法 100% 擋住技術人員**（有人能用工具偽造 Origin 直接呼叫）。對個人小型學習網站通常足夠；若想更嚴格可再加通行碼，或在 Google 設用量上限作為保險。
- 金鑰本身已安全地存在 Worker 端，前端原始碼看不到。
