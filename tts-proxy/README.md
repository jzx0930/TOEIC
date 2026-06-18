# 發音代理（Cloudflare Worker）部署說明

把 Google TTS 金鑰藏到 Cloudflare Worker，前端只透過「通行碼」呼叫代理，金鑰不再出現在網頁原始碼。

## 你需要準備

- 一個 Cloudflare 帳號（免費即可）
- 你的 Google Text-to-Speech 金鑰
- 自訂一組「通行碼」（任意字串，只給自己用，例如 `my-secret-2026`）

---

## 步驟一：建立 Worker

1. 登入 Cloudflare → 左側選 **Workers & Pages** → **Create**（建立）→ 選 **Create Worker**。
2. 取個名字，例如 `toeic-tts`，按 **Deploy** 先部署一個預設範本。
3. 進入該 Worker → **Edit code**（編輯程式碼），把編輯器內容**整個換成** `worker.js` 的內容（本資料夾內那支），再按 **Deploy**。
4. 部署後會得到一個網址，長得像：
   `https://toeic-tts.你的子網域.workers.dev`
   **記下這個網址**，等下要填進前端。

## 步驟二：設定 Secret（金鑰與通行碼）

在該 Worker 的 **Settings（設定）→ Variables and Secrets（變數與機密）** 新增**兩個 Secret**（類型選 *Secret*，不是 Plaintext）：

| 名稱 | 值 |
| --- | --- |
| `GOOGLE_API_KEY` | 你的 Google TTS 金鑰 |
| `ACCESS_TOKEN` | 你自訂的通行碼 |

（可選）再加一個一般變數限制來源：

| 名稱 | 值 |
| --- | --- |
| `ALLOWED_ORIGIN` | 你的網站來源，例如 `https://jzx0930.github.io` |

設定完按 **Deploy / Save** 讓變更生效。

## 步驟三：把代理網址填進前端

打開專案的 `index.html`，找到這一行（在發音功能區）：

```js
const TTS_PROXY_URL = "https://toeic-tts.YOUR-SUBDOMAIN.workers.dev";
```

把網址改成**步驟一**得到的你自己的 Worker 網址，存檔。

## 步驟四：鎖緊 Google 金鑰（建議）

到 Google Cloud Console → **API 和服務 → 憑證 → 你的金鑰**：

- **API 限制**：限定只能用「Cloud Text-to-Speech API」。
- （網站來源限制對「伺服器端呼叫」無效，所以這裡主要靠 API 限制 + Worker 的通行碼把關。）

---

## 使用方式

- 第一次在網站按發音時，會跳出輸入框要你輸入**通行碼**（就是 `ACCESS_TOKEN` 的值）。
- 輸入正確後會記在瀏覽器（localStorage），同一台裝置之後不必再輸入。
- 想換裝置或換通行碼：在 Cloudflare 改 `ACCESS_TOKEN`，並清掉瀏覽器的 `ttsToken`（或直接清網站資料）重新輸入即可。

## 注意

- 「🔁 重複」與「🔁 循環播放區塊」用的是瀏覽器免費內建語音，**不經過這個代理、也不耗 Google 額度**。只有單次發音（🇬🇧/🇺🇸）、測驗唸答案、側欄 🔊 會走代理。
- 公開網站本質上無法對「打開瀏覽器開發者工具的人」完全藏住通行碼；但金鑰已安全地留在 Worker 端，且通行碼可隨時更換、Google 金鑰可設用量上限，足以防止一般濫用。
