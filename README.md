# TOEIC 學習網站

一個**純前端**的多益（TOEIC）自學網站，部署於 GitHub Pages。黑底螢光綠的終端機風格，三個分頁：**單字**、**發音**、**文法**。

> 線上版：`https://<你的帳號>.github.io/TOEIC/`（用 GitHub Desktop 推送後生效）

---

## 功能總覽

### 📘 單字
- 單字卡：英文 ＋ KK 音標（在單字後）、第二行「音節拆解」（單字＋KK）、中文、詞性、記憶筆記。
- 發音：🇬🇧 英式 / 🇺🇸 美式（走 Google TTS 代理，真人音質）；🔁 重複、🔁 循環播放（瀏覽器內建語音，免費）。
- 循環朗讀：整區塊自動朗讀，可選「只英文」或「英中循環」；**次數**（1/2/3）、**速度**拖曳桿（0.1x–2.0x，重複播放也即時跟著變速）。
- 每次載入單字順序隨機洗牌，避免每次只看最上面幾個。
- 抽考測驗：可複選、可折疊的範圍；題目框整框變綠(對)/紅(錯)回饋；正確/錯誤清單左右兩欄；答錯可存進 `word/Unfamiliar.json`。
- 搜尋：跨檔案自動展開、捲動、標亮。

### 🗣️ 發音
- **KK 音標一覽表**（母音／子音）。每格：KK 符號 ＋ 英文例字 ＋ 🔊 發音鈕（播放例字示範該音）。
- 資料來源：`Pronunciation/kk-chart.json`（依標準 KK 音標符號整理）。

### 📖 文法
- 6 大類、37 個主題，點入為**全螢幕教學**（結構、用法、例句上色、自繪 SVG 時間軸、小試身手）。
- 資料來源：`Grammar/grammar.json`。

---

## 檔案結構

```
index.html        主頁面 + 內嵌核心 <script>（載入、單字卡、發音、循環、抽考、發音表、文法）
index.css         全站樣式
index.js          通用 UI（章節展開/收合、複製、英中/筆記切換）
word/             單字資料：list.json 定義載入順序與清單；其餘為各單字 .json
Grammar/          文法資料：grammar.json
Pronunciation/    發音資料：kk-chart.json（KK 音標表）
tts-proxy/        Cloudflare Worker（Google TTS 代理）程式與說明
tools/            check-kk.mjs（用 CMUdict 檢查 KK / 補 KK / 產音節拆解，本機執行）
note/             筆記與參考資料（含 kk 音標.pdf）
檢查KK-報告.bat        雙擊：跑 CMUdict 檢查，印報告（唯讀）
檢查KK-寫回拆解.bat    雙擊：補缺 KK、寫回 sylWord/sylKK（會改 word/*.json）
```

> `node_modules/`、`package.json`、`package-lock.json` 只有在本機跑工具時才會產生，已由 `.gitignore` 排除、不會推上 GitHub。

---

## 單字資料格式（`word/*.json`）

一律使用 **JSON**（已不再用 .txt）。每個檔是一個陣列：

```json
[
  { "word": "colleague", "kk": "[ˈkɑlig]", "translation": "同事", "part_of_speech": "n.", "note": "",
    "sylWord": "col·league", "sylKK": "ˈkɑ·lig" }
]
```

- `kk`：KK 音標（用標準 KK 符號，見 `note/kk 音標.pdf`）。
- `sylWord` / `sylKK`（選填）：音節拆解，以 `·` 分隔。**沒填時網頁會自動拆**；填了就以你的為準。
- 新增單字檔後，要把檔名加進 `word/list.json` 才會載入。

---

## KK 檢查 / 補音標工具（本機執行）

沙盒/雲端裝不了套件，請在**自己電腦**跑（需 [Node.js](https://nodejs.org/) LTS）：

- **檢查KK-報告.bat**：雙擊 → 自動裝套件 → 用 CMUdict 比對每個字的 KK，列出「查不到」與「疑似不一致」的字。只讀不改。
- **檢查KK-寫回拆解.bat**：雙擊 → 按 Y → 用 CMUdict 幫**缺 KK**的字補上 KK（照標準符號），並把 `sylWord`/`sylKK` 音節拆解寫回 `word/*.json`。

用到的開源套件：`cmu-pronouncing-dictionary`（美式發音辭典）、`hyphen`（連字號斷音節）。注意 CMUdict 是美式；查不到的字（OOV）會列出來，需人工補。

---

## 發音（TTS）說明

- 單次發音（🇬🇧/🇺🇸）、測驗唸題、側欄 🔊、發音表 🔊：走 **Cloudflare Worker 代理**（`tts-proxy/`），Google 金鑰存在 Worker 的 Secret，前端看不到。
- 🔁 重複、循環朗讀：用瀏覽器內建語音（免費，不耗 Google 額度）。
- 部署與金鑰設定見 `tts-proxy/README.md`。金鑰**絕不**寫進前端；若外洩務必到 Google Cloud 重新產生。

---

## 開發須知

1. **破快取版本號**：改完 `index.css` / `index.js`（含 index.html 內嵌 script）後，把 index.html 裡 `index.css?v=N` 與 `index.js?v=N` 的 **N 同步加一**。
2. **資料檔**（`word/*.json`、`Grammar/grammar.json`、`Pronunciation/kk-chart.json`）用 `?t=時間戳` 抓取，內容更新後立即生效、不吃版本號。
3. **GitHub Pages 區分大小寫**：`fetch` 路徑須與實際檔名/資料夾大小寫完全一致。
4. 純前端、相對路徑，不可用本機絕對路徑或開頭 `/`。
5. 用 **GitHub Desktop** 提交/推送；正式站看不到新內容多半是還沒推送，或需 Ctrl+F5 強制重整。
