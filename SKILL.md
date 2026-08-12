---
name: toeic-project-guide
description: >
  TOEIC 單字 ＋ 發音 ＋ 文法學習網站（純前端、部署於 GitHub Pages）的完整專案狀態、協作慣例與領域知識。
  涵蓋：整體功能說明（§9）、已擁有但未啟用/未使用的功能與資產（§10）、哪些資料不推送到 GitHub 及其運作邏輯（§11）、
  以及當前狀態速記（§12）——目的是讓「別的裝置或別的 AI 框架」讀完本 Skill 就能掌握專案現況並接手。
  當使用者上傳或詢問此專案（index.html / index.css / index.js、word/、Grammar/、Pronunciation/、
  tts-proxy/、tools/），或要新增單字/文法內容、改循環播放/抽考測驗/發音表、處理破快取版本號、
  GitHub Pages 部署與檔名大小寫、Cloudflare TTS 代理、KK 音標/音節拆解、或問「這專案現在能做什麼/有什麼沒開/什麼沒推上去」時，先讀本 Skill 並遵循。
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
word/        單字：list.json 定義載入清單與順序；其餘各單字 .json（★ 一律 JSON，已淘汰 .txt）。約 1,558 筆
Grammar/     文法：grammar.json（★ 7 大類、41 主題；第 0 類「文法基礎」為近期新增）
Pronunciation/ 發音：kk-chart.json（KK 音標一覽表）＋ kk 音標.pdf（KK 符號參考）＋ audio/（空資料夾，未使用）
tts-proxy/   Cloudflare Worker（Google TTS 代理）：worker.js ＋ README.md
tools/       check-kk.mjs ＋ 兩支 .bat（檢查KK-報告.bat / 檢查KK-寫回拆解.bat，雙擊執行）＋ package.json（被 gitignore）
note/        其他筆記（note.txt、多益單字生成提示詞.txt）
delete/      待刪舊檔（真人音檔等，★ 被 .gitignore 排除，不推 GitHub）
```
不納入版控的內容見 §11。目前前端破快取版本號為 **v=66**（`index.css?v=66` / `index.js?v=66`）。

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
- **抽考** `openQuiz`/`nextQuestion`/`handleAnswer`：範圍可複選折疊；題型 `en-cn`（看英文選中文）/`cn-en`（看中文選英文）。
  - 選項為 **2×2 四宮格**（`#quizOptions` id 規則 `grid-template-columns:1fr 1fr`＋`align-items:stretch`，同列等高；圓角方塊 `.option-btn`）。⚠️ `#quizOptions` 是 **id 選擇器**，權重高於任何 `.quiz-options-grid` class，改欄數要改這條。
  - **對錯回饋**用題目框變色（`.quiz-question-box.correct/.wrong`）＋選項標綠/紅。
  - 版面三欄：左=正確清單、中=題目與選項、右=錯誤清單；中間 `.main-quiz-area` 用 `align-self:center`（高度只到內容、垂直置中，不與左右等高）；**右側錯誤清單外框紅色**（`.quiz-sidebar:last-child{border-color:red}`）。手機（≤1200/≤768）左右清單並排、各保留 30vh、`quiz-layout` 可捲動。
  - **進題自動唸題**：只有 `en-cn`（題目是英文）會唸；`cn-en` 題目是中文不唸。
  - **作答後**：`en-cn` 停 0.5 秒進下一題；`cn-en` **立刻唸出正確英文答案並立刻換題**（發音延續播放到下一題、不衝突）。
  - 答錯存 `word/Unfamiliar.json`（`saveWrongWords`）；提前結束鈕在題目框外上方。
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
例句上色（所有含例句的 block 都適用）：`<k>…</k>` 綠（主要動詞/V-ing/p.p.）、`<b>…</b>` 藍（be/助動詞）；白字為底。SVG 屬性用單引號保 JSON 有效。

**block 型別**：
- `h`（綠標題）、`p`（段）、`list`、`note`（黃提示框）、`examples`（items{en,zh,note}）、`diagram`（自製 SVG）。
- `formula`（★公式區塊）：`{ "type":"formula", "lines":[ { "label":"一般主詞", "text":"主詞　＋　動詞原形" }, … ] }`。綠框、多行**同樣大**、置中；label 是上方小字；text 內可用 `<k>`(綠)/`<b>`(藍) 標關鍵變化。用來把「結構／公式」獨立醒目呈現。
- `ruletable`（★變化規則表，規則↔例句對齊）：`{ "type":"ruletable", "head":["變化規則","例句"], "rows":[ { "name":"一般動詞", "change":"直接 ＋ -s", "sub":"work → works", "ex":{ "en":"…", "zh":"…", "note":"➤說明" } } ] }`。左欄規則（name 白／change 綠／sub 灰），右欄完整例句（en白／zh灰／note綠➤）。`ex` 可為單一物件或陣列（多句）。
- `usetable`（★使用時機，編號徽章）：`{ "type":"usetable", "rows":[ { "n":"用法一", "note":"說明", "hint":"（選填）補充", "ex":[ {en,zh,note} ] } ] }`。左綠色徽章、中說明、右例句。head 預設 `["用法","說明","例句"]`。
- `errtable`（★常見錯誤）：`{ "type":"errtable", "rows":[ { "n":"錯誤一", "note":"說明", "wrong":"He work.", "right":"He <k>works</k>." } ] }`。紅色徽章；右欄自動排成 `✗ wrong → ✓ right`。

**版式慣例（做每個文法主題都照這個）**：
1. 開場用 `p`（＋必要 `list`）交代這個時態/文法解決什麼。
2. 「結構」用 **`formula`** 呈現（肯定/否定/疑問可各一個 formula）；拼寫或形態變化用 **`ruletable`**（規則配例句對齊）。
3. 「使用時機」的 用法一/二/三… 一律用 **`usetable`**（編號徽章＋說明＋例句）。
4. 「常見錯誤」的 錯誤一/二… 一律用 **`errtable`**（✗→✓）。
5. 需要時穿插 `note`（黃框重點）、`diagram`（自製 SVG 時間軸）。
6. 結尾「小試身手」用 `examples`(題目)＋`list`(選項)＋`note`(答案，答案用 `<k>` 標綠)。
（範本見「現在簡單式」。舊的純 `p`+`list`+`examples` 仍可渲染，但新主題與改版一律採用上面的 formula/表格版式。）

**細部慣例（近期新增，所有主題都要遵守）**：
- **不要出現「FORMULA」字樣**：formula 區塊不加英文 FORMULA 標籤（`lines` 不放這種 label）。
- **公式照主詞分行**：當結構會因主詞不同而改變（如否定 don't／doesn't、疑問 Do／Does、be 動詞 am／is／are），**否定與疑問各自拆成兩行 formula**：一行「一般主詞」、一行「第三人稱單數」，兩行同樣大，不要把兩種主詞擠成一行或用小灰字。
- **標註主詞涵蓋範圍**：凡出現「一般主詞」「第三人稱單數」等 label，要在括號內說明包含哪些（如「一般主詞（I／you／we／they、複數名詞）」「第三人稱單數（he／she／it、人名、公司名）」）。
- **例句要涵蓋每種主詞**：只要公式分了「一般主詞／三單」，`examples` 也要**兩種主詞各給至少一句**（如否定要同時有 don't 與 doesn't 的例句、疑問要同時有 Do 與 Does）。
- **術語一律白話解釋**：文中第一次出現文法術語（be 動詞、一般動詞、助動詞、分詞、不定詞、關係代名詞…）就順帶用括號白話說明，例如「be 動詞＝am／is／are／was／were（是／在的動詞）」「一般動詞＝work、eat、go 這類表動作的動詞」。不要假設讀者已懂術語。
- **主詞怎麼配動詞/助動詞要「明講」**：只要某結構的動詞或助動詞會隨主詞改變（have／has、am／is／are、was／were、do／does、is／are 被動…），除了 formula 分行外，**一定要另加一個「主詞 → 用哪個」的 `note`（一句白話口訣）＋ `ruletable`（左欄主詞、右欄例句）**，把「哪種主詞配哪個字」講到不用猜。範本見「現在進行式」(am/is/are)、「現在完成式」(have/has)。**讀者不該需要自己從 formula label 推斷**。

## 6. KK 音標與音節拆解
- KK 用**標準 KK 符號**（見 `Pronunciation/kk 音標.pdf`）：母音 `e`(name)/`o`(no)、`ɝ`(bird)/`ɚ`(sister)、雙母音 `aɪ/aʊ/ɔɪ`；子音 `g`(good)、`ŋ`、`tʃ`、`dʒ` 等。**不要**用 IPA 的 `oʊ/eɪ/ː` 或手寫體 `ɡ`。
- **拆解顯示是即時的**：只要單字有 `kk`，第二行自動出現拆解，照 KK 表符號。
- **工具 `tools/check-kk.mjs`**（本機跑或沙盒跑皆可——沙盒 npm registry 被擋裝不了套件，但 repo 內已有 `node_modules/`（gitignore）可直接 `node` 執行）：`node tools/check-kk.mjs` 用 CMUdict 檢查 KK；`--write` 幫缺 KK 的字補 KK、寫回 `sylWord`/`sylKK`；`--write --force` 連「已有 kk」的字也一律用 CMUdict（美式標準）覆蓋，讓 **kk 與 sylKK 完全一致**、且和網頁「🇺🇸 美式」Google TTS 對得起來（OOV 片語/專有名詞/整句不動）。用 `cmu-pronouncing-dictionary` + `hyphen`。CMUdict 是美式、OOV 需人工補。工具內含修正：CMUdict 把非重音 `ER0` 單獨成節又接母音節時（director→dɚˈɛktɚ）會把 r 移到下一節（→dəˈrɛktɚ）。兩支 `.bat` 是雙擊入口（純 ASCII 內容）。
- **KK 一律以「劍橋美式」為準**：kk 要跟劍橋辭典美式音一致（也對應網頁🇺🇸 Google TTS）。工具的 ARPAbet→KK 已內建兩個對齊劍橋美式的規則：(1) **最大合法起始子音**切音節——kr／str／spl… 整組留給下一音節（across→ə·ˈkrɑs、instrument→ˈɪn·strə·mənt），而非 ək·rɔs；(2) **AO 母音 cot–caught 合流**——AO 只有「緊接 r」才唸 ɔ（for→fɔr、north→nɔrθ），其餘一律 ɑ（across→ɑ、dog→dɑg、thought→θɑt）。若使用者反映 kk 與發音對不上，跑 `node tools/check-kk.mjs --write --force` 重建即可。CMUdict 查不到的片語/專有名詞（OOV，約 177 筆）維持原樣，需人工或逐字查劍橋補。

## 7. 發音 / TTS 代理
- 單次發音、測驗唸題、側欄🔊、發音表🔊 → `speakWord()` → **Cloudflare Worker 代理**（`TTS_PROXY_URL`），Google 金鑰在 Worker Secret。
- 🔁 重複/循環 → 瀏覽器 `SpeechSynthesis`（免費）；英文 `en-US`、中文 `zh-TW`。
- Worker 用 `ALLOWED_ORIGIN`（來源網域）保護、不需通行碼；Google 端金鑰限「僅 Cloud Text-to-Speech API」、應用程式限制設「無」、**專案要開啟帳單**（否則回 403 PERMISSION_DENIED）。詳見 `tts-proxy/README.md`。金鑰絕不寫前端；外洩要重新產生。

## 8. 部署與 Git
- 使用者用 **GitHub Desktop** 提交/推送；沙盒無法 push、也**無法刪除**掛載檔。
- 沙盒 git 因 `core.autocrlf` 未設會誤判 CRLF/LF 變動；以 GitHub Desktop 顯示為準，別在沙盒 `git add -A`。
- 遇合併衝突標記先解決再繼續。

## 9. 功能總覽（使用者視角，可當「這專案現在能做什麼」的完整說明）
一個純前端多益學習網站，頂部三個分頁切換（`switchTab`）：

**（1）Vocabulary（單字）分頁** — 預設分頁。
- 依 `word/list.json` 逐檔載入單字，渲染成一張張**單字卡**：第一行「英文單字 ＋ KK 音標」，第二行「音節拆解」（單字與 KK 皆以 `·` 斷音節）。每次載入時卡片順序 **Fisher–Yates 洗牌**。
- 每張卡有發音鈕：**🇬🇧 英式 / 🇺🇸 美式**（Google 真人 TTS，經 Cloudflare 代理）、**🔁 英式 / 🔁 美式**（瀏覽器免費語音，可循環、跟隨速度拖曳桿）。發音速度受**速度拖曳桿**控制（0.1/0.5/1.0/1.5/2.0x），🇺🇸/🇬🇧 也會套用（`audio.playbackRate`）。
- **循環朗讀**：每個單字區塊標題右側有控制列（次數、速度、兩顆循環鈕），可整段連續朗讀（純英 / 英中對照）。
- **抽考測驗**（見 §4）：可複選單字範圍、兩種題型、2×2 選項、即時對錯回饋、正確/錯誤清單、答錯自動存 `Unfamiliar.json`。
- 中英/筆記切換、複製、展開收合等通用 UI 在 `index.js`。

**（2）Pronunciation（發音）分頁** — `initPronounce` → `renderPronounce` 讀 `Pronunciation/kk-chart.json`。
- 顯示 **KK 音標一覽表**（母音 single/diphthong、子音），每格「[符號] 例字 🔊」。
- 🔊 播放邏輯 `playKKAudio(slug, example, ipa, synth)`：
  - **母音＋雙母音＋鼻音/流音（m,n,ŋ,l,r）**：`synth:true` → 用 **Google TTS 的 SSML `<phoneme>`（IPA）合成單音**（`playSSMLPhoneme`，`<prosody rate="slow">` 放慢）。
  - **摩擦音/塞音/塞擦音/滑音（其餘 19 個子音，f v θ ð s z ʃ ʒ p b t d k g tʃ dʒ j w h）**：無 `synth` → **直接唸英文例字**（`speakWord(example)`）。（曾試過用真人音檔與純合成子音，最後定案採此混合方案。）

**（3）Grammar（文法）分頁** — `initGrammar` → `renderGrammar`；點主題開**全螢幕視窗** `openGrammarModal`（Esc 關），`grammarDetailHtml` 依 `content.blocks` 逐塊渲染（見 §5 的 block 型別與版式慣例）。

**跨分頁的 TTS 架構**：真人音質發音一律走 `speakWord()` → Cloudflare Worker 代理 → Google Cloud TTS（金鑰在 Worker Secret，**前端永遠看不到**）；🔁 循環用瀏覽器內建 `SpeechSynthesis`（免費、不耗 API 額度）。

## 10. 已擁有但「未啟用／未使用」的功能與資產（重要：換裝置/換 AI 也要知道這些存在）
- **真人 KK 音檔（44 檔，`delete/audio/`）**：早期從 Wikimedia 下載的 CC-BY-SA 3.0 單音素錄音（含 `CREDITS.md` 署名）。**目前完全未使用**（發音表已改成「合成單音＋唸例字」的混合方案），整個 `delete/` 已被 `.gitignore` 排除、不推 GitHub，保留僅備查，可安全刪除。
- **音檔下載工具（`delete/download-ipa-audio.mjs` ＋ `下載發音音檔.bat`）**：當初抓 Wikimedia 音檔用的 Node 腳本與雙擊入口，含 429 限流的延遲/重試。連同 `delete/` 一起未使用、未推。
- **舊版瀏覽器合成發音 `speakWord`**：`index.html` 內有一段 `/* （已停用的舊版本）… SpeechSynthesis */` 註解掉的舊實作，**已停用**；現行 `speakWord` 走 Google 代理。
- **「返回主頁」按鈕**：`index.html` 頂部 `<!-- <a href="index.html" class="back-button">🏠 返回主頁</a> -->` 註解保留、**目前停用**。
- **文法 `image` block 型別**：`grammarDetailHtml` 支援 `{ "type":"image", "src", "alt" }` 渲染 `<img class="g-img">`，標為「（備用）自製圖片檔」。**目前資料未使用**（時間軸/關係圖一律用自製 `diagram` SVG，不用外部圖片）。
- **`word/字尾.json`**：檔案存在但**不在 `word/list.json` 內 → 不會被載入**（0 筆或未整理的字尾資料）。要啟用就加進 `list.json`。
- **`Pronunciation/audio/`**：空資料夾，**未使用**（KK 表不讀本地音檔）。
- **`Unfamiliar.json`（答錯簿）**：功能有啟用（測驗答錯自動寫入、且在 `list.json` 中會被載入成一個單字範圍），但內容依使用者實際作答而定，可能為空。
- **速度拖曳桿的極端檔位（0.1x／2.0x）**：功能可用，只是平常用 1.0x。

## 11. 「不推送到 GitHub」的資料與其運作邏輯（.gitignore 詳解）
`.gitignore` 內容與原因、以及「為何拿掉也不影響網站」：

- **`node_modules/`**：只有本機跑 `tools/check-kk.mjs`（KK 檢查/重建）才需要的 npm 套件（`cmu-pronouncing-dictionary`、`hyphen`）。**網站本身純前端、執行期完全不用它**，故不推。沙盒因 npm registry 被擋無法重裝，但 repo 目錄已存在本機 `node_modules/`，沙盒可直接 `node tools/check-kk.mjs` 執行。
- **`package.json` / `package-lock.json`**：注意 `.gitignore` 寫的是不帶路徑的 `package.json`，**會比對任何層級** → 根目錄與 `tools/package.json` 都被忽略。這兩個檔只是給本機工具用（宣告 `type:module` 與相依），網站不需要。
- **`delete/`**：整個資料夾（44 個真人音檔＋下載腳本＋bat，見 §10），純備查、不使用，故不推。
- **`Thumbs.db` / `.DS_Store`**：Windows/macOS 檔案總管產生的雜項，永遠不推。
- **`npm-debug.log*`**：npm 錯誤日誌，不推。
- **（非檔案但同等重要）Google Cloud TTS 金鑰**：**絕不寫在前端、也不進 repo**；只存在 Cloudflare Worker 的 Secret。前端只知道 `TTS_PROXY_URL`（Worker 網址）。金鑰外洩要立即在 Google Cloud 重新產生並更新 Worker Secret。

**運作邏輯總結（為何「不推的東西」不影響部署）**：GitHub Pages 只服務靜態檔；網站在瀏覽器端用相對路徑 `fetch` 讀 `word/`、`Grammar/`、`Pronunciation/` 的 JSON（都帶 `?t=Date.now()` 時間戳即時更新），發音打 Worker 代理。整條執行鏈**不依賴** `node_modules/`、`package.json`、`delete/`、金鑰檔——這些純屬「本機開發/工具/備查/機密」範疇，因此排除在版控之外既安全又不影響線上功能。

## 12. 當前狀態速記（換裝置/換 AI 快速接手）
- 前端版本號：**v=66**（改 CSS/JS 記得同步 +1，見 §3）。
- 文法：7 大類、41 主題，全面採 formula/ruletable/usetable/errtable 版式（§5）；結構隨主詞變化者都附「主詞→用哪個」對照表；術語有白話解釋。
- KK：全 1,381 個 CMUdict 可查單字已用 `--force` 重建、對齊**劍橋美式**（最大合法起始子音切音節＋AO cot–caught 合流），kk 與 sylKK 完全一致；177 筆 OOV（片語/專有名詞/整句）維持原樣。
- 發音：混合方案（母音/鼻音/流音合成、其餘子音唸例字）；速度拖曳桿套用到所有真人發音。
- 測驗：2×2 四宮格、cn-en 作答即唸即換題、錯誤清單紅框、中間區置中。
