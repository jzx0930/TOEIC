---
name: toeic-project-guide
description: >
  TOEIC 單字卡 ＋ 文法學習網站（純前端、部署於 GitHub Pages）的協作慣例與領域知識。
  當使用者上傳或詢問此專案（index.html / index.css / index.js、word/、Grammar/、tts-proxy/），
  或要新增單字/文法內容、修改循環播放/抽考測驗/發音、處理破快取版本號、GitHub Pages 部署與
  檔名大小寫、Cloudflare TTS 代理時，先讀本 Skill 並遵循以下慣例。
  文法內容一律以「過去、未來完成式」為標準範本呈現（見 §6）。
---

# TOEIC 單字 ＋ 文法學習網站 — 專案指南

## 1. 專案概觀
- 一個**純前端**的多益（TOEIC）學習網站，兩個分頁：**單字**與**文法**。
- 技術：原生 HTML + CSS + JavaScript，無框架、無建置流程；用 `fetch` 讀取本地 JSON/TXT。
- 部署：**GitHub Pages**（靜態、相對路徑）。repo 通常是 `jzx0930/TOEIC`。
- 視覺：黑底 + 螢光綠（終端機風），色彩變數在 `index.css` 的 `:root`。

## 2. 檔案結構與職責
```
index.html   主頁面 + 內嵌核心 <script>（資料載入、單字卡渲染、發音、循環朗讀、抽考、文法渲染、全螢幕視窗）
index.css    全站樣式（變數、單字卡、折疊、測驗彈窗、分頁、文法、全螢幕視窗、RWD）
index.js     通用 UI（章節展開/收合、複製鈕、英中與筆記顯示切換）；defer 載入，同名函式以此為準
word/        單字資料：list.json 定義載入順序；*.json（建議）或 *.txt（舊格式）
Grammar/     文法資料：grammar.json（6 大類、37 子項）
tts-proxy/   Cloudflare Worker（Google TTS 代理）程式與部署說明
SKILL.md     本指南
```

## 3. 開發鐵則（每次都要遵守）
1. **破快取**：
   - `index.html` 的 `index.css?v=N`、`index.js?v=N`：**每次改完 CSS/JS 就把 N 加一**（兩行要一致）。
   - **資料檔（grammar.json、word/list.json、word/*.json）以 `?t=" + Date.now()` 抓取**（程式已內建），確保內容更新後**立刻看得到**、不被瀏覽器/Pages 快取。⚠️ 曾發生「改了 grammar.json 卻仍顯示舊內容」就是因為沒帶時間戳——別把這行改回無時間戳。
2. **GitHub Pages 區分大小寫**：`fetch` 路徑須與實際檔名/資料夾大小寫完全一致（資料夾 `Grammar`、`word`）。
3. **純前端、相對路徑**：不可用本機絕對路徑或開頭 `/`；不引入後端。
4. **驗證**：沙盒 bash 掛載常同步延遲/截斷，統計不可信；**以檔案工具（Read/Edit）為準**。要跑 `node --check` 先確認已同步（grep 到最新字串再檢查）。改 grammar.json 後**務必驗 JSON 有效**（含內嵌 SVG）。
5. **不改邏輯只加註解**時逐字保留原碼。程式與註解皆繁體中文。
6. **每次修改後**主動附上可貼上的 **commit 內容**：`Summary`（一行）＋ `Description`（條列）。使用者用 GitHub Desktop 提交；遇 `A lock file already exists` 請他刪 `.git\index.lock`。**正式站看不到新內容多半是還沒 push**——提醒他先推送再重整。

## 4. 主要功能與位置（都在 index.html 內嵌 script）
- **單字卡**：`loadWordsFromFile`；英文、KK 音標、中文、筆記；顯示切換 `toggleSingleWord/Chinese`、`toggleAllNotes`。
- **循環朗讀**：`toggleSectionLoop(section, mode)` / `startSectionLoop`。模式 `'en'`（只英文）、`'en-cn'`（英→中）。標題右側有：**次數**核取（1/2/3，`repeatCount`）、**速度**拖曳桿（`SPEED_STEPS`、`speechRate`）、兩顆循環鈕。
- **跟隨停止/繼續鈕**：`attachFollowStopBtn`/`pauseLoopPlayback`/`resumeLoopPlayback`；`findCardByWord(word, sectionEl)` 限縮當前區塊避免跨檔同名字捲錯。
- **抽考測驗**：`openQuiz`；範圍可複選可折疊；題型預設 `en-cn`。答錯可存進 `word/Unfamiliar.json`（`saveWrongWords`，File System Access API）。
- **搜尋**：`searchWord`。
- **分頁**：`switchTab('vocab'|'grammar')`；文法延遲載入 `initGrammar`。
- **文法**：`renderGrammar` 讀 `Grammar/grammar.json`；點子項用**全螢幕視窗** `openGrammarModal`（`#grammarModal`，Esc 可關）顯示；`grammarDetailHtml` 依 `content.blocks` 渲染。

## 5. 資料格式
### 單字（word/*.json）
```json
{ "word": "colleague", "kk": "[ˈkɑlig]", "translation": "同事", "part_of_speech": "n.", "note": "" }
```
舊 `.txt`：每行 `英文|中文`。`word/list.json` 是字串陣列，定義載入哪些檔與順序。

### 文法（Grammar/grammar.json）
陣列，每大類含 `category` 與 `topics[]`；每個 topic：`{ "title", "desc", "content" }`。
`content` 支援兩種格式（`grammarDetailHtml` 皆可）：
- **完整文章（正式內容，優先）**：`{ "blocks": [ … ] }`，block 型別見 §6。
- **精簡佔位**：`{ point, structure[], examples[{en,zh}], tip }`（尚無正式內容的主題暫用，之後逐一換成 blocks）。

## 6. 文法內容製作規範 ★（以「過去、未來完成式」為標準範本）
每個文法主題點下去是**全螢幕視窗**，裡面是一篇**完整教學文章**。做每個主題都照這個標準：

### 6-1 內容一律「自製」，嚴禁抄來源
- 使用者資料夾（可能在 Desktop，用 `request_cowork_directory` 取得）內的圖片，**只是給你「看懂該主題要教什麼」的參考**。
- **成品一律自寫**：用**自己的話**寫說明、用**自己的例句**（標準文法示範句），**不得沿用來源 app 的原文或例句、也不得只做微幅字詞替換**。
- **圖表一律自繪**：時態時間軸／關係圖等，**自己用 SVG 畫**（套本站深色＋綠色主題），**嚴禁使用來源截圖**。

### 6-2 blocks 型別
- `{ "type":"h", "text":"小節標題" }`（綠色橫幅）
- `{ "type":"p", "text":"段落" }`
- `{ "type":"list", "items":["…","…"] }`
- `{ "type":"note", "text":"提示/答案框" }`
- `{ "type":"examples", "items":[ { "en":"…", "zh":"…", "note":"➤ 說明(可省略)" } ] }`
- `{ "type":"diagram", "svg":"<svg …>…</svg>" }`（自製 SVG，見 6-4）

### 6-3 例句上色（白字＋彩色關鍵字）
在 `en`/`zh` 內用標記凸顯重點（白字為底）：
- `<k>…</k>` → 綠色：主要重點（示範該時態的**主要動詞、V-ing、過去分詞**）。
- `<b>…</b>` → 藍色：次要（**be 動詞、助動詞** had / will have 等）。
- 例：`"en": "By 9 p.m., I <b>will have</b> <k>finished</k> the report."`

### 6-4 自製 SVG 時態時間軸（範本）
用「過去｜現在｜未來」橫軸 + 彩色長條表示各時態涵蓋的期間；配色：現在完成式=橘 `#ffaa00`、過去完成式=紅 `#ff5555`、未來完成式=藍 `#4da3ff`、現在線=綠 `#00ff99`、軸線=灰 `#888`。**SVG 屬性用單引號**（避免 JSON 內雙引號衝突）。骨架範例：
```
<svg viewBox='0 0 600 165' xmlns='http://www.w3.org/2000/svg' style='width:100%;max-width:560px'>
  <text x='300' y='20' fill='#00ff99' font-size='15' font-weight='700' text-anchor='middle'>現在</text>
  <line x1='300' y1='28' x2='300' y2='148' stroke='#00ff99' stroke-width='2' stroke-dasharray='4 4'/>
  <rect x='60' y='40' width='240' height='30' rx='4' fill='#ffaa00'/>
  <text x='180' y='60' fill='#111' font-size='14' font-weight='700' text-anchor='middle'>現在完成式</text>
  <line x1='40' y1='138' x2='558' y2='138' stroke='#888' stroke-width='2'/>
</svg>
```

### 6-5 建議文章結構（照範本）
1. 開場 `p`：這個時態要解決什麼問題／和前一個時態的關係。
2. `h` 結構 → `p` 公式（`had + p.p.` 之類，關鍵字上色）→ `examples`。
3. `h` 使用時機 → 需要時放 `diagram` 時間軸 → 分點 `p` + 各自 `examples`。
4. （多益相關）`p`：這個時態在多益怎麼考、常見陷阱。
5. `h` 小試身手 → `examples`(題目) + `list`(選項 A–D) + `note`(答案與解析，答案用 `<k>` 標綠)。

### 6-6 流程
1. **資料夾名稱 = 文法主題名**（例如 `過去、未來完成式/`）；內容放進 grammar.json 中**同名 topic** 的 `content`。
2. 讀圖**理解**要教的重點與時間軸概念。
3. 依 6-1～6-5 **自寫** blocks 內容、**自畫** SVG。
4. **升版號**（css/js `?v=` 加一）→ 驗證 JSON/JS/CSS → 給 commit 內容 → 提醒使用者 push 後重整。

## 7. 發音 / TTS 代理
- **單次發音（🇬🇧/🇺🇸）、測驗唸答案、側欄 🔊**：`speakWord()` → 呼叫 **Cloudflare Worker 代理**（`TTS_PROXY_URL`），Google 金鑰存在 Worker 的 Secret，前端看不到。
- **🔁 重複、循環朗讀**：瀏覽器內建 `SpeechSynthesis`（免費）；英文 `en-US`、中文 `zh-TW`。
- Worker 用 **`ALLOWED_ORIGIN`（來源網域）**保護、**不需通行碼**；Google 端金鑰限「僅 Cloud Text-to-Speech API」、應用程式限制設「無」。詳見 `tts-proxy/README.md`。金鑰絕不寫前端；若曾外洩務必在 Google Cloud 重新產生。

## 8. 部署與 Git
- 使用者用 **GitHub Desktop** 提交/推送；沙盒無法 push（proxy 擋 + 無認證）。
- 沙盒 git 因 `core.autocrlf` 未設，會把很多檔案當成 CRLF/LF 變動；**以 GitHub Desktop 顯示的真實變動為準**，別在沙盒 `git add -A`。
- 遇合併衝突標記（`<<<<<<<`/`=======`/`>>>>>>>`）先解決再繼續。
