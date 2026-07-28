---
name: toeic-project-guide
description: >
  TOEIC 單字 ＋ 發音 ＋ 文法學習網站（純前端、部署於 GitHub Pages）的協作慣例與領域知識。
  當使用者上傳或詢問此專案（index.html / index.css / index.js、word/、Grammar/、Pronunciation/、
  tts-proxy/、tools/），或要新增單字/文法內容、改循環播放/抽考測驗/發音表、處理破快取版本號、
  GitHub Pages 部署與檔名大小寫、Cloudflare TTS 代理、KK 音標/音節拆解時，先讀本 Skill 並遵循。
---

# TOEIC 單字 ＋ 發音 ＋ 文法網站 — 專案指南

## 1. 專案概觀
- **純前端**多益學習網站，三分頁：**單字**、**發音**、**文法**。
- 原生 HTML + CSS + JS，無框架、無建置；用 `fetch` 讀本地 JSON。
- 部署 **GitHub Pages**（靜態、相對路徑、區分大小寫）。repo 通常 `jzx0930/TOEIC`。
- 視覺：黑底 + 螢光綠（終端機風），色彩變數在 `index.css` 的 `:root`。

## 2. 檔案結構
```
index.html   主頁 + 內嵌核心 <script>（載入、單字卡、發音、循環、抽考、發音表、文法、全螢幕視窗）
index.css    全站樣式
index.js     通用 UI（展開/收合、複製、英中/筆記切換）；defer 載入，同名函式以此為準
word/        單字：list.json 定義載入清單與順序；其餘各單字 .json（★ 一律 JSON，已淘汰 .txt）
Grammar/     文法：grammar.json（6 大類、37 主題）
Pronunciation/ 發音：kk-chart.json（KK 音標一覽表）
tts-proxy/   Cloudflare Worker（Google TTS 代理）
tools/       check-kk.mjs（CMUdict 檢查/補 KK/產拆解，本機執行）
note/        筆記與參考（含 kk 音標.pdf）
*.bat        檢查KK-報告.bat / 檢查KK-寫回拆解.bat（雙擊跑 tools）
```
`node_modules/`、`package.json`、`package-lock.json` 由 `.gitignore` 排除（跑工具才產生，不推 GitHub）。

## 3. 開發鐵則（每次都要遵守）
1. **破快取版本號**：改完 CSS/JS（含 index.html 內嵌 script）→ index.html 的 `index.css?v=N`、`index.js?v=N` **N 同步加一**（兩行一致）。
2. **資料檔用時間戳**：`word/*.json`、`Grammar/grammar.json`、`Pronunciation/kk-chart.json` 都以 `?t=" + Date.now()` 抓取（已內建），確保更新即時可見。⚠️ 別把時間戳改回無。
3. **GitHub Pages 區分大小寫**：`fetch` 路徑大小寫要與實際完全一致（`Grammar`、`Pronunciation`、`word`）。
4. **純前端、相對路徑**：不可用本機絕對路徑或開頭 `/`；不引入後端。
5. **驗證**：沙盒 bash 掛載常延遲/截斷，統計不可信；以檔案工具（Read/Edit）為準。改 JSON 後用 `python3 json.load` 驗；內嵌 JS 先去 HTML 註解再抽 `<script>` 用 `node --check`/vm 驗。
6. **沙盒不能刪除/移動**掛載資料夾內的檔（權限不足）；要刪檔請「列清單請使用者手動刪」。
7. **每次修改後**主動附可貼上的 commit：`Summary`（一行）＋ `Description`（條列）。使用者用 GitHub Desktop 提交；遇 `A lock file already exists` 請刪 `.git\index.lock`。正式站看不到新內容多半是還沒 push 或要 Ctrl+F5。

## 4. 主要功能與位置（多在 index.html 內嵌 script）
- **單字卡** `loadWordsFromFile`：第一行「單字＋KK」；第二行「音節拆解 sylWord＋sylKK」（`getSyllableParts`／`splitWord`／`splitKK` 自動產生，可被單字檔的 `sylWord`/`sylKK` 覆蓋）。載入時 Fisher–Yates 洗牌。
- **發音** `speakWord`（Google 代理，🇬🇧/🇺🇸/🔊）；`repeatSpeak`（瀏覽器語音，🔁，每次重播讀當下速度）。`currentAudio` 防重疊。
- **循環朗讀** `toggleSectionLoop(section, mode)`：mode `'en'`/`'en-cn'`；標題右側控制列**分兩列**（第一列 次數＋速度，第二列 兩顆循環鈕，靠左對齊）。
- **抽考** `openQuiz`/`nextQuestion`/`handleAnswer`：範圍可複選折疊；預設題型 `en-cn`；進題自動唸英文題目；**對錯用題目框變色**（`.quiz-question-box.correct/.wrong`）；正確/錯誤清單**左右兩欄**（手機也是）；提前結束鈕在題目框外上方；下一題 0.5 秒、不等發音。答錯存 `word/Unfamiliar.json`（`saveWrongWords`）。
- **分頁** `switchTab('vocab'|'pronounce'|'grammar')`：發音延遲 `initPronounce`、文法延遲 `initGrammar`。
- **發音表** `renderPronounce`：讀 `Pronunciation/kk-chart.json`，母音/子音格線，每格「[符號] 例字 🔊」，🔊 播放例字。
- **文法** `renderGrammar` + 全螢幕視窗 `openGrammarModal`（`#grammarModal`，Esc 關）；`grammarDetailHtml` 依 `content.blocks` 渲染。

## 5. 資料格式
### 單字 `word/*.json`（★ 一律 JSON）
```json
{ "word":"colleague", "kk":"[ˈkɑlig]", "translation":"同事", "part_of_speech":"n.", "note":"",
  "sylWord":"col·league", "sylKK":"ˈkɑ·lig" }
```
- `sylWord`/`sylKK` 選填，`·` 分隔；沒填則網頁自動拆。新增檔要加進 `word/list.json`。

### 發音 `Pronunciation/kk-chart.json`
`{ "vowels": { "single":[…], "diphthong":[…] }, "consonants":[…] }`，每項 `{ "symbol":"i", "example":"tea" }`。

### 文法 `Grammar/grammar.json`
陣列，每大類 `{ category, topics[] }`；每 topic `{ title, desc, content:{ blocks:[…] } }`。
block 型別：`h`(綠標題)、`p`(段)、`list`、`note`(提示框)、`examples`(items{en,zh,note})、`diagram`(自製 SVG)。
例句上色：`<k>…</k>` 綠（主要動詞/V-ing/p.p.）、`<b>…</b>` 藍（be/助動詞）；SVG 屬性用單引號保 JSON 有效。

## 6. KK 音標與音節拆解
- KK 用**標準 KK 符號**（見 `note/kk 音標.pdf`）：母音 `e`(name)/`o`(no)、`ɝ`(bird)/`ɚ`(sister)、雙母音 `aɪ/aʊ/ɔɪ`；子音 `g`(good)、`ŋ`、`tʃ`、`dʒ` 等。**不要**用 IPA 的 `oʊ/eɪ/ː` 或手寫體 `ɡ`。
- **拆解顯示是即時的**：只要單字有 `kk`，第二行自動出現拆解，照 KK 表符號。
- **工具 `tools/check-kk.mjs`**（本機跑，沙盒裝不了套件）：`node tools/check-kk.mjs` 用 CMUdict 檢查 KK；`--write` 幫缺 KK 的字補 KK、寫回 `sylWord`/`sylKK`。用 `cmu-pronouncing-dictionary` + `hyphen`。CMUdict 是美式、OOV 需人工補。兩支 `.bat` 是雙擊入口（純 ASCII 內容）。

## 7. 發音 / TTS 代理
- 單次發音、測驗唸題、側欄🔊、發音表🔊 → `speakWord()` → **Cloudflare Worker 代理**（`TTS_PROXY_URL`），Google 金鑰在 Worker Secret。
- 🔁 重複/循環 → 瀏覽器 `SpeechSynthesis`（免費）；英文 `en-US`、中文 `zh-TW`。
- Worker 用 `ALLOWED_ORIGIN`（來源網域）保護、不需通行碼；Google 端金鑰限「僅 Cloud Text-to-Speech API」、應用程式限制設「無」、**專案要開啟帳單**（否則回 403 PERMISSION_DENIED）。詳見 `tts-proxy/README.md`。金鑰絕不寫前端；外洩要重新產生。

## 8. 部署與 Git
- 使用者用 **GitHub Desktop** 提交/推送；沙盒無法 push、也**無法刪除**掛載檔。
- 沙盒 git 因 `core.autocrlf` 未設會誤判 CRLF/LF 變動；以 GitHub Desktop 顯示為準，別在沙盒 `git add -A`。
- 遇合併衝突標記先解決再繼續。
