---
name: toeic-project-guide
description: >
  TOEIC 單字卡 ＋ 文法學習網站（純前端、部署於 GitHub Pages）的協作慣例與領域知識。
  當使用者上傳或詢問此專案（index.html / index.css / index.js、word/、Grammar/、tts-proxy/），
  或要新增單字/文法內容、修改循環播放/抽考測驗/發音、處理破快取版本號、GitHub Pages 部署與
  檔名大小寫、Cloudflare TTS 代理時，先讀本 Skill 並遵循以下慣例。
---

# TOEIC 單字 ＋ 文法學習網站 — 專案指南

## 1. 專案概觀
- 一個**純前端**的多益（TOEIC）學習網站，兩個分頁：**單字**與**文法**。
- 技術：原生 HTML + CSS + JavaScript，無框架、無建置流程；用 `fetch` 讀取本地 JSON/TXT。
- 部署：**GitHub Pages**（靜態、相對路徑）。repo 通常是 `jzx0930/TOEIC`。
- 視覺風格：黑底 + 螢光綠（終端機風），色彩變數定義在 `index.css` 的 `:root`。

## 2. 檔案結構與職責
```
index.html   主頁面 + 內嵌核心 <script>（資料載入、單字卡渲染、發音、循環朗讀、抽考、文法渲染）
index.css    全站樣式（含變數、單字卡、折疊、測驗彈窗、分頁、文法、全螢幕視窗、RWD）
index.js     通用 UI（章節展開/收合、複製鈕、英中與筆記顯示切換）；defer 載入，同名函式以此為準
word/        單字資料：list.json 定義載入順序；*.json（建議）或 *.txt（舊格式）
Grammar/     文法資料：grammar.json（6 大類）；各主題的教學圖片放在 Grammar/<主題名>/
tts-proxy/   Cloudflare Worker（Google TTS 代理）程式與部署說明
note/        開發筆記與備份
README.md    專案說明
```

## 3. 開發鐵則（每次都要遵守）
1. **破快取版本號**：`index.html` 的 `index.css?v=N` 與 `index.js?v=N`，**每次改完 CSS/JS 就把 N 加一**（兩行版本號要一致）。注意 `?v=` 只能更新 CSS/JS 快取，不能更新 index.html 本身；手機卡舊版時請使用者清網站快取或用無痕。
2. **GitHub Pages 區分大小寫**：`fetch` 的路徑必須與實際檔名/資料夾**大小寫完全一致**（例如資料夾是大寫 `Grammar`、`word/list.json`）。
3. **純前端、相對路徑**：不可用本機絕對路徑或開頭 `/`；不引入後端。
4. **驗證方式**：沙盒的 bash 掛載（/sessions/.../mnt/…）常**同步延遲或截斷**，其括號/行數統計不可信。以**檔案工具（Read/Edit）為準**；要跑 `node --check` 時，先確認 bash 已同步（grep 得到最新字串再檢查），失敗多半是還沒同步，重試即可。內嵌 JS 檢查法：抽出 `<script>…</script>` 內容再 `node --check`。
5. **不改動邏輯、只加註解**時要逐字保留原碼。程式碼與註解皆為繁體中文。
6. **每次修改後**，主動附上可直接貼上的 **commit 內容**：`Summary`（一行）＋ `Description`（條列）。使用者用 GitHub Desktop 提交；若遇 `A lock file already exists` 就請他刪 `.git\index.lock`。

## 4. 主要功能與所在位置（都在 index.html 內嵌 script）
- **單字卡**：`loadWordsFromFile`；卡片含英文、KK 音標、中文、筆記；`toggleSingleWord/Chinese`、`toggleAllNotes` 等顯示切換。
- **循環朗讀**：`toggleSectionLoop(section, mode)` / `startSectionLoop`。兩種模式：`'en'`（只唸英文）與 `'en-cn'`（英文一遍→中文一遍）。每個區塊標題右側有：**次數**核取方塊（1/2/3，`repeatCount`）、**速度**拖曳桿（`SPEED_STEPS=[0.1,0.5,1,1.5,2]`，`speechRate`）、兩顆循環鈕。
- **跟隨停止/繼續鈕**：`attachFollowStopBtn` / `pauseLoopPlayback`（暫停並變「繼續循環」）/ `resumeLoopPlayback`（從該卡片續播）。找卡片用 `findCardByWord(word, sectionEl)`，**限縮在當前區塊**避免跨檔同名字捲到別處。
- **抽考測驗**：`openQuiz`；測驗範圍為**可複選、可折疊**的核取方塊；題型預設 `en-cn`（看英文選中文）。結束/提前結束可把答錯的字存進 `word/Unfamiliar.json`（`saveWrongWords`，用 File System Access API，Chrome/Edge 直接寫檔、其他瀏覽器下載）。
- **搜尋**：`searchWord`（跨區塊、自動展開+捲動+標亮）。
- **分頁切換**：`switchTab('vocab'|'grammar')`；文法延遲載入（`initGrammar`）。
- **文法**：`renderGrammar` 讀 `Grammar/grammar.json`；點子項用**全螢幕視窗** `openGrammarModal`（`#grammarModal`，Esc 可關）顯示，不再擠在小卡。

## 5. 資料格式
### 單字（word/*.json）
```json
{ "word": "colleague", "kk": "[ˈkɑlig]", "translation": "同事", "part_of_speech": "n.", "note": "" }
```
- 舊 `.txt` 格式：每行 `英文|中文`。
- `word/list.json` 是字串陣列，定義載入哪些檔與順序。
- 測驗池 `quizPool` 只取 `en`(word) 與 `cn`(translation)。

### 文法（Grammar/grammar.json）
陣列，每個大類含 `category` 與 `topics[]`；每個 topic：
```json
{
  "title": "現在簡單式",
  "desc": "卡片上的一句預覽說明",
  "content": { "blocks": [ ... ] }
}
```
`content` 兩種格式，`grammarDetailHtml` 皆支援：
- **完整教學文章（優先）**：`{ "blocks": [ ... ] }`，block 型別：
  - `{ "type":"h", "text":"小節標題" }`
  - `{ "type":"p", "text":"段落" }`
  - `{ "type":"list", "items":["…","…"] }`
  - `{ "type":"note", "text":"黃色提示框" }`
  - `{ "type":"examples", "items":[ { "en":"…", "zh":"…", "note":"➤ 說明(可省略)" } ] }`
  - `{ "type":"diagram", "svg":"<svg …>…</svg>" }`（時態時間軸/關係圖，**一律自製 SVG**，見下方規範）
- **例句關鍵字上色（重要）**：例句要**還原圖片的配色**——白字為底，關鍵字用顏色凸顯重點。在 `en`/`zh` 文字內用標記：
  - `<k>…</k>` → 綠色（主要重點，如 V-ing、示範該時態的動詞）
  - `<b>…</b>` → 藍色（次要，如 be 動詞）
  - 例：`"en": "You <b>are</b> <k>reading</k> this line right now."`
- **精簡佔位格式**：`{ "point","structure":[],"examples":[{en,zh}],"tip" }`（尚未有正式內容的主題暫用）。

## 6. 新增內容的流程
- **新增單字**：在 `word/` 放 `.json`/`.txt` → 加進 `word/list.json` → 重整。
- **新增文法內容**：
  1. **資料夾名稱 = 文法主題名**：使用者把教學圖片放進以主題命名的資料夾（例如 `現在進行式/`、`現在完成式/`），該資料夾內容就是要填進**同名 topic** 的 `content`。資料夾可能在 repo 外（例如 Desktop），必要時用 `request_cowork_directory` 取得存取。
  2. **逐字忠實轉錄**成該 topic 的 `content.blocks`：**內容以圖片為準、忠實呈現，不自行杜撰**（若圖片只有大綱，先確認使用者是否要自己提供內容）。
  3. **例句上色**：用 `<k>`（綠）、`<b>`（藍）標記關鍵字，還原圖片「白字+彩色重點」的呈現（見上一節格式）。
  4. **時態時間軸/關係圖 → 一律自製**：若圖片含時間軸或關係圖，**自行用 SVG（或 HTML/CSS）重新繪製**，套用本站深色＋綠色主題，放進 `diagram` block。**嚴禁直接使用來源資料夾的圖片**——那是他站截圖、有版權問題；來源資料夾的圖片**只作為「看懂內容、據以自製」的參考**，正式成品（文字轉錄、圖表重繪）一律自製。
  5. 完成後**升版號**。

## 7. 發音 / TTS 代理
- **單次發音（🇬🇧/🇺🇸）、測驗唸答案、側欄 🔊**：走 `speakWord()` → 呼叫 **Cloudflare Worker 代理**（`TTS_PROXY_URL`），Google 金鑰存在 Worker 的 Secret（前端看不到）。
- **🔁 重複、循環朗讀**：用**瀏覽器內建 SpeechSynthesis**（免費，不耗 Google 額度）；英文 `en-US`、中文 `zh-TW`。
- Worker 用 **`ALLOWED_ORIGIN`（來源網域）**保護、**不需通行碼**；金鑰在 Google 端限制「僅 Cloud Text-to-Speech API」、應用程式限制設「無」。詳見 `tts-proxy/README.md`。
- **安全**：金鑰絕不寫在前端；若曾外洩（git 歷史）務必到 Google Cloud 重新產生。

## 8. 部署與 Git
- 使用者用 **GitHub Desktop** 提交/推送；沙盒無法 push（proxy 擋 + 無認證）。
- 沙盒 git 因 `core.autocrlf` 未設，會把很多檔案當成 CRLF/LF 變動；**以使用者 GitHub Desktop 顯示的真實變動為準**，別在沙盒 `git add -A`。
- 遇合併衝突標記（`<<<<<<<`/`=======`/`>>>>>>>`）要先解決再繼續。
