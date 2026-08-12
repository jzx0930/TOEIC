---
name: toeic-project-guide
description: >
  TOEIC 單字 ＋ 發音 ＋ 文法學習網站（純前端、部署於 GitHub Pages）的**完整交接文件**。
  本檔的用途是「跨裝置／跨 AI 框架交接」：只讀這一份、不看其他檔，就能掌握專案現況並接手後續修改。
  涵蓋定位、架構、目錄、功能（使用者＋開發者視角）、如何在新環境跑起來、已擁有但未啟用的功能、
  不納入版控的內容與邏輯、機密與外部相依、慣例與雷區、當前狀態速記。
  當使用者上傳或詢問此專案（index.html / index.css / index.js、word/、Grammar/、Pronunciation/、
  tts-proxy/、tools/），或要新增單字/文法內容、改循環/測驗/發音表、處理版本號、GitHub Pages 部署、
  Cloudflare TTS 代理、KK 音標/音節拆解、或問「這專案現在能做什麼／有什麼沒開／什麼沒推上去」時，先讀本檔並遵循。
---

# TOEIC 單字 ＋ 發音 ＋ 文法網站 — 交接文件（單一事實來源）

> **本檔用途**：讓另一台裝置或另一個 AI 框架讀完這一份，就能完整掌握專案現況並接手修改，不必再翻其他檔。
>
> ⚠️ **維護規則（最重要）**：日後**每一次**修改專案（程式、資料、設定、部署）都必須**同步更新本檔**，讓它永遠是「唯一最新事實來源」。改完程式別忘了 §9 的破快取版本號規則，改完本檔則不需動版本號。

---

## 1. 一句話定位
一個**純前端**的多益（TOEIC）自學網站：三個分頁「**單字 / 發音 / 文法**」，給準備多益或想背單字、練發音、學文法的自學者，用單字卡＋真人發音＋KK 音標表＋結構化文法教學＋抽考測驗，把「背、聽、考」整合在一個免安裝的網頁裡。

## 2. 技術棧與架構
- **語言/框架**：原生 HTML + CSS + JavaScript，**無框架、無打包、無建置步驟**。
- **部署**：GitHub Pages（純靜態；相對路徑；**檔名區分大小寫**）。repo 通常為 `jzx0930/TOEIC`，正式站 `https://jzx0930.github.io/TOEIC/`。
- **資料**：所有內容放在本地 JSON，前端用 `fetch` 讀取（都帶 `?t=" + Date.now()` 時間戳即時更新）。
- **發音**：真人音質走 **Cloudflare Worker 代理 → Google Cloud Text-to-Speech**（金鑰藏在 Worker，前端看不到）；循環朗讀走瀏覽器免費 `SpeechSynthesis`。
- **視覺**：黑底＋螢光綠終端機風，色彩變數在 `index.css` 的 `:root`。

**資料流**：
```
瀏覽器 index.html
 ├─ index.js（defer）：通用 UI（章節展開/收合、複製鈕、英中/筆記顯示切換）
 ├─ index.html 內嵌 <script>：核心邏輯（載入單字、發音、循環、抽考、發音表、文法、全螢幕視窗）
 │    └─ fetch → word/*.json、Grammar/grammar.json、Pronunciation/kk-chart.json（皆 ?t=Date.now()）
 └─ 發音 speakWord() → fetch TTS_PROXY_URL（Cloudflare Worker）→ Google TTS → base64 MP3 → <audio>
```

## 3. 目錄結構
```
index.html      主頁＋內嵌核心 <script>（單字卡/發音/循環/抽考/發音表/文法/全螢幕視窗/TTS）
index.css       全站樣式＋響應式 @media（斷點 1200/768/480，另有 600/380 供其他區塊）
index.js        通用 UI（章節展開收合、程式碼複製鈕、英/中/筆記顯示切換）；defer 載入
word/           單字資料（★ 一律 JSON，已淘汰 .txt）
  ├─ list.json  ★ 定義「要載入哪些檔、順序」；新增單字檔一定要加進這裡才會顯示
  ├─ 單字1.json … 多益必考單字.json / 聽力單字1~3.json / Word UP1~2.json / 網路上蒐集.json / 日常句子.json / 高頻Unit1.json
  ├─ Unfamiliar.json  抽考答錯自動寫入的「答錯簿」（已在 list.json，會被載入）
  └─ 字尾.json  ★ 存在但不在 list.json → 目前不會載入（見 §6）
Grammar/
  └─ grammar.json  ★ 7 大類、41 主題（第 0 類「文法基礎」為近期新增）
Pronunciation/
  ├─ kk-chart.json  KK 音標一覽表（母音 single/diphthong、子音）
  ├─ kk 音標.pdf    KK 符號參考
  └─ audio/         空資料夾，未使用
tts-proxy/
  ├─ worker.js      Cloudflare Worker（Google TTS 代理，含 CORS/來源白名單/SSML 支援）
  └─ README.md      代理設定教學
tools/
  ├─ check-kk.mjs   用 CMUdict 檢查/重建 KK（本機或沙盒跑，需 node_modules）
  ├─ package.json   工具用（★ 被 .gitignore；見 §7）
  └─ 檢查KK-報告.bat / 檢查KK-寫回拆解.bat  雙擊入口（純 ASCII）
note/             筆記（note.txt、多益單字生成提示詞.txt）
delete/           待刪舊檔（真人音檔等，★ 被 .gitignore，不推 GitHub；見 §6/§7）
README.md         專案簡介
SKILL.md          ← 本檔（交接文件）
node_modules/     ★ 被 .gitignore（工具相依，網站不用）
package.json / package-lock.json  ★ 被 .gitignore
```

## 4. 功能總覽（使用者視角＋開發者視角）
頂部三分頁切換：`switchTab('vocab' | 'pronounce' | 'grammar')`（發音/文法首次進入才 `initPronounce` / `initGrammar` 延遲初始化）。核心邏輯多在 **index.html 內嵌 `<script>`**；通用 UI 在 **index.js**。

**（1）Vocabulary 單字（預設分頁）**
- **單字卡**：`loadWordsFromFile` 依 `word/list.json` 逐檔載入並渲染。第一行「英文＋KK」，第二行「音節拆解」（`getSyllableParts`／`splitWord`／`splitKK`，可被單字檔的 `sylWord`/`sylKK` 覆蓋）。載入時 **Fisher–Yates 洗牌**。
- **發音鈕**：🇬🇧/🇺🇸 真人（`speakWord(word,lang)` → Google 代理）；🔁 循環（`repeatSpeak`，瀏覽器語音、免費）。速度受**速度拖曳桿**控制：`SPEED_STEPS=[0.1,0.5,1.0,1.5,2.0]`、`setSpeechRateByIndex`、`getSpeechRate`；🇺🇸/🇬🇧 也套用（`audio.playbackRate = getSpeechRate()`）。`currentAudio` 防重疊。
- **循環朗讀**：`toggleSectionLoop(section, mode)`，mode `'en'`/`'en-cn'`；標題右側控制列兩列（次數＋速度／兩顆循環鈕）。
- **英/中/筆記顯示切換**（index.js）：`toggleSingleWord`/`toggleSingleChinese`/`toggleAllWords`/`toggleAllChinese`/`toggleAllNotes`（遮答案自我測驗）。
- **抽考測驗**：`openQuiz`／`nextQuestion`／`handleAnswer`／`updateSideList`／`finishQuiz`／`closeQuiz`。
  - 範圍可複選折疊；題型 `en-cn`（看英文選中文）/`cn-en`（看中文選英文）。
  - 選項 **2×2 四宮格**：容器 `#quizOptions{grid-template-columns:1fr 1fr; align-items:stretch}`（同列等高），圓角方塊 `.option-btn`。
  - 對錯回饋＝題目框變色（`.quiz-question-box.correct/.wrong`）＋選項標綠/紅。三欄：左正確清單／中題目選項／右錯誤清單；中間 `.main-quiz-area{align-self:center}`（矮、垂直置中）；右側錯誤清單外框紅色（`.quiz-sidebar:last-child`）。手機左右清單並排各 30vh、可捲動。
  - 進題自動唸題只在 `en-cn`；作答後 `en-cn` 停 0.5 秒進下一題，`cn-en` **立刻唸正確英文答案並立刻換題**（音檔延續播放不衝突）。
  - 答錯自動存 `word/Unfamiliar.json`（`saveWrongWords`）。

**（2）Pronunciation 發音**：`initPronounce` → `renderPronounce` 讀 `Pronunciation/kk-chart.json`，母音/子音格線，每格「[符號] 例字 🔊」。
- 🔊 播放 `playKKAudio(slug, example, ipa, synth)`：
  - **母音＋雙母音＋鼻音/流音（m,n,ŋ,l,r）**：`synth:true` → `playSSMLPhoneme(ipa,example)` 用 **Google TTS 的 SSML `<phoneme>`（IPA）合成單音**（`<prosody rate="slow">` 放慢）。
  - **其餘 19 個子音（f v θ ð s z ʃ ʒ p b t d k g tʃ dʒ j w h）**：無 `synth` → **直接唸英文例字**。（此混合方案是多次試驗後定案。）

**（3）Grammar 文法**：`initGrammar` → `renderGrammar`；點主題開全螢幕視窗 `openGrammarModal`（`#grammarModal`，Esc 關）；`grammarDetailHtml(c)` 依 `content.blocks` 逐塊渲染（block 型別與版式見 §9）。

## 5. 如何在新環境跑起來
**網站本身不需安裝或建置**（純靜態）。
- **本機預覽**：用任何靜態伺服器起在 http（例如 `python -m http.server`）再開 `localhost`，或直接推上 GitHub Pages 看。⚠️ 用 `file://` 直接開會有兩個問題：剪貼簿複製鈕需 https/localhost 才能用；真人發音會因 Origin 不在 Worker 白名單而失敗（🔁 瀏覽器語音仍可）。
- **部署**：用 **GitHub Desktop** commit＋push 到 `jzx0930/TOEIC`；GitHub Pages 自動出站。看不到新內容多半是還沒 push、或要 Ctrl+F5，或忘了升版本號（見 §9）。
- **KK 工具**：`node tools/check-kk.mjs`（報告）／`--write`（補缺 KK＋寫回音節）／`--write --force`（連既有 kk 也重建、對齊劍橋美式）。需要 `node_modules`（`cmu-pronouncing-dictionary`＋`hyphen`）：USB 整包複製會一起帶；若是 `git clone`（node_modules 被忽略）則要在有網路的機器 `npm install`（沙盒的 npm registry 被擋、裝不了，但若目錄已有 node_modules 可直接 `node` 跑）。
- **沒有測試框架**。驗證方式：改 JSON 後 `python3 -c "import json;json.load(open('檔'))"`；改內嵌 JS 先去 HTML 註解再抽 `<script>` 用 `node --check`。

## 6. 已擁有但「未啟用／未使用」的功能與資產（換裝置/換 AI 也要知道）
- **真人 KK 音檔（44 檔，`delete/audio/`）**：早期抓的 Wikimedia CC-BY-SA 3.0 單音素錄音（含 `CREDITS.md` 署名）。發音表已改混合方案 → **完全未使用**；整個 `delete/` 被 gitignore、不推。可安全刪除。
- **音檔下載工具（`delete/download-ipa-audio.mjs`＋`下載發音音檔.bat`）**：當初抓音檔用，含 429 限流退避。未使用、未推。
- **舊版瀏覽器合成 `speakWord`**：`index.html` 有一段 `/* （已停用的舊版本）… SpeechSynthesis */` 註解，**已停用**；現行走 Google 代理。
- **「返回主頁」按鈕**：`index.html` 頂部 `<!-- <a ... class="back-button">🏠 返回主頁</a> -->` 註解保留、**停用中**。
- **文法 `image` block 型別**：`grammarDetailHtml` 支援 `{ "type":"image","src","alt" }`（標「備用」），但**資料未使用**（時間軸/關係圖一律自製 `diagram` SVG）。要啟用：在某主題 blocks 加 image 物件即可。
- **`word/字尾.json`**：檔案在、但**不在 `word/list.json` → 不載入**。要啟用：加進 `list.json`。
- **`Pronunciation/audio/`**：空資料夾，未使用。
- **速度拖曳桿極端檔位（0.1x／2.0x）**：可用，平常用 1.0x。

## 7. 版控範圍與運作邏輯（原則：只推「維運必要」，其餘留本機）

**核心原則（rule 11）**：**只有「維持網站運作的必要檔」才推進 GitHub，其餘（工具、備查、筆記、機密、可再生檔）都只留在本機。** 判斷基準＝「GitHub Pages 服務時，瀏覽器會不會 `fetch`/載入它？會＝必推；不會＝可留本機」。

**目前 repo 實際追蹤的檔，依此原則分三類：**

| 類別 | 檔案 | 說明 |
|---|---|---|
| **A. 必推（跑網站必要，執行期會載入）** | `index.html`、`index.css`、`index.js`、`word/*.json`（含 `list.json`）、`Grammar/grammar.json`、`Pronunciation/kk-chart.json` | 瀏覽器直接載入/`fetch`；少了就壞。 |
| **B. 建議保留（非執行必要，但屬「原始碼/交接安全」值得版控）** | `tts-proxy/worker.js`（部署到 Cloudflare 的**唯一原始碼**）、`SKILL.md`（本交接文件）、`README.md`、`.gitignore` | 網站執行不讀它們，但弄丟代價高（Worker 原始碼、交接知識）。體積小，留著。 |
| **C. 可只留本機（純本機工具/備查/筆記，符合 rule 11 可移出版控）** | `tools/check-kk.mjs`＋兩支 `.bat`、`note/*.txt`、`Pronunciation/kk 音標.pdf`、`tts-proxy/README.md` | 只有本機開發/查資料用，網站執行期完全不碰。 |

> ⚠️ C 類目前仍被追蹤（歷史遺留）。若要落實 rule 11 把它們移出版控：在 `.gitignore` 加對應項目，並在 **GitHub Desktop 用 `git rm --cached <路徑>`**（或右鍵移除追蹤但保留檔案）提交一次；沙盒無法 `git rm`。移除**不影響線上網站**（見下方運作邏輯）。SKILL.md/README/worker.js 建議**保留追蹤**，因為若別人用 `git clone`（而非 USB 整包複製）取得專案，這些留在 repo 才拿得到。

**已明確排除、不追蹤的項目（`.gitignore` 實際內容）**：`node_modules/`、`package.json`、`package-lock.json`、`npm-debug.log*`、`delete/`、`Thumbs.db`、`.DS_Store`。

- **`node_modules/`**：只有本機跑 `tools/check-kk.mjs` 才需的 npm 套件（cmu-pronouncing-dictionary、hyphen）。**網站執行期完全不用**，故不推。
- **`package.json` / `package-lock.json`**：⚠️ gitignore 寫的是**不帶路徑**的 `package.json`，會比對**任何層級** → 根目錄與 `tools/package.json` 都被忽略。只給本機工具用（宣告 `type:module` 與相依），網站不需要。
- **`delete/`**：整包備查舊檔（44 音檔＋下載腳本＋bat），不使用，故不推。
- **`Thumbs.db` / `.DS_Store` / `npm-debug.log*`**：OS 雜項與日誌，永不推。
- **（非檔案但同等重要）Google TTS 金鑰**：**絕不入庫、不寫前端**，只存在 Cloudflare Worker Secret（見 §8）。

**為何「不推的東西」不影響部署**：GitHub Pages 只服務靜態檔；瀏覽器用相對路徑 `fetch` 讀 `word/`、`Grammar/`、`Pronunciation/` 的 JSON（帶時間戳即時更新），發音打 Worker 代理。整條執行鏈**不依賴** node_modules、package.json、delete/、金鑰檔——這些純屬「本機開發／工具／備查／機密」，排除在版控外既安全又不影響線上。

## 8. 機密與外部相依
- **Google Cloud TTS 金鑰**：存 Cloudflare Worker 的 Secret **`GOOGLE_API_KEY`**；前端只知道 `TTS_PROXY_URL`（`index.html` 內＝`https://toeic-tts.fuli62.workers.dev`）。**外洩處置**：立刻到 Google Cloud 重新產生金鑰、更新 Worker Secret、重新部署 Worker。金鑰限制建議：僅「Cloud Text-to-Speech API」、應用程式限制設「無」。
- **Worker 保護**：用一般變數 **`ALLOWED_ORIGIN`**（來源網域白名單，可逗號分隔，例 `https://jzx0930.github.io,http://localhost:8000`；留空＝不限制、不建議）比對請求 Origin，不需通行碼。**換部署網址就要更新 `ALLOWED_ORIGIN`**，否則真人發音被 403。
- **Worker 介面**：POST JSON `{ text | ssml, lang:"en-US"|"en-GB" }` → `{ audioContent: base64 MP3 }`；支援純文字或 SSML（`input: ssml ? {ssml} : {text}`）；聲音 `en-US-Standard-C` / `en-GB-Standard-A`（FEMALE、MP3）；text 限 500 字、ssml 限 800 字。
- **外部服務**：① Cloudflare Workers（跑代理）②Google Cloud TTS（**專案須開啟帳單**，否則回 403 PERMISSION_DENIED）。詳見 `tts-proxy/README.md`。
- **工具相依（僅本機）**：npm `cmu-pronouncing-dictionary`（v3，具名匯出 `dictionary`）、`hyphen`（ESM 要 import `hyphen/en-us/index.js` 的 `hyphenateSync`，輸出用軟連字號 U+00AD）。

## 9. 慣例與雷區

### 9.1 開發鐵則（每次都遵守）
1. **破快取版本號**：改完 CSS/JS（含 index.html 內嵌 script）→ index.html 的 `index.css?v=N`、`index.js?v=N` **N 同步加一**（兩行一致）。目前 **v=66**。
2. **資料檔用時間戳**：`word/*.json`、`Grammar/grammar.json`、`Pronunciation/kk-chart.json` 以 `?t=" + Date.now()` 抓取（已內建）；⚠️ 別把時間戳改回無、也不必為資料變更升版號。
3. **GitHub Pages 區分大小寫**：`fetch` 路徑大小寫要與實際完全一致（`Grammar`、`Pronunciation`、`word`）。
4. **純前端、相對路徑**：不可用本機絕對路徑或開頭 `/`；不引入後端。
5. **驗證**：沙盒 bash 掛載常延遲/截斷，統計不可信；以檔案工具（Read/Edit）為準。JSON 用 `python3 json.load` 驗；內嵌 JS 用 `node --check`。
6. **沙盒不能刪除/移動**掛載資料夾內的檔（權限不足）；要刪檔請「列清單請使用者手動刪」。`mv` 可、`rm`/`rmdir` 不可。
7. **每次修改附可貼上的 commit**（Summary 一行＋Description 條列）。使用者用 GitHub Desktop 提交；遇 `A lock file already exists` 請關掉 GitHub Desktop、刪 `.git\index.lock` 再試。
8. **改完同步更新本 SKILL.md**（見開頭維護規則）。

### 9.2 常見雷區
- **`#quizOptions` 是 id 選擇器**：權重高於任何 `.quiz-options-grid` class；要改選項欄數/樣式得改這條 id 規則（曾因此改 class 沒生效）。
- **沙盒無法 push、無法刪掛載檔**；git 因 `core.autocrlf` 未設會誤判 CRLF/LF，別在沙盒 `git add -A`，以 GitHub Desktop 顯示為準。
- **文法 SVG 屬性用單引號**（保 JSON 有效）。
- **KK 要跟 🇺🇸 美式一致**（見 9.4）；對不上就跑 `--force` 重建。

### 9.3 資料格式與內容慣例
**單字 `word/*.json`**（陣列）：
```json
{ "word":"colleague", "kk":"[ˈkɑlig]", "translation":"同事", "part_of_speech":"n.", "note":"",
  "sylWord":"col·league", "sylKK":"ˈkɑ·lig" }
```
`sylWord`/`sylKK` 選填（`·` 分隔），沒填則網頁自動拆。**新增檔要加進 `word/list.json`**。（測驗以 `en`/`cn` 欄判定，單字卡以 `word`/`translation`；資料裡兩種鍵都可能出現，沿用既有檔的鍵。）

**發音 `Pronunciation/kk-chart.json`**：`{ "vowels":{ "single":[…], "diphthong":[…] }, "consonants":[…] }`；每項 `{ symbol, example, ipa, exampleKK, audio, synth? }`。`synth:true`＝合成單音（母音＋m/n/ŋ/l/r）；無 synth 的 19 子音唸例字。

**文法 `Grammar/grammar.json`**：陣列，每大類 `{ category, topics[] }`；每 topic `{ title, desc, content:{ blocks:[…] } }`。例句上色（所有含例句的 block 適用）：`<k>…</k>` 綠（主要動詞/V-ing/p.p.）、`<b>…</b>` 藍（be/助動詞），白字為底。
- **block 型別**：`h`（綠標題）、`p`（段）、`list`、`note`（黃提示框）、`examples`（items{en,zh,note}）、`diagram`（自製 SVG）、`image`（備用，未使用）、`formula`、`ruletable`、`usetable`、`errtable`。
  - `formula`：`{ "type":"formula","lines":[ {label,text}, … ] }`，綠框多行同樣大置中；label 上方小字、text 內可 `<k>`/`<b>`。
  - `ruletable`：`{ "type":"ruletable","head":["變化規則","例句"],"rows":[ {name,change,sub,ex} ] }`；左欄規則（name 白/change 綠/sub 灰）、右欄完整例句；`ex` 可為物件或陣列。
  - `usetable`：`{ "type":"usetable","rows":[ {n,note,hint?,ex:[…]} ] }`；綠色編號徽章＋說明＋例句。
  - `errtable`：`{ "type":"errtable","rows":[ {n,note,wrong,right} ] }`；紅徽章，右欄自動排 `✗ wrong → ✓ right`。
- **版式慣例（每個主題都照做）**：① 開場 `p`(＋`list`) 交代解決什麼；②「結構」用 `formula`（肯定/否定/疑問可各一），拼寫/形態變化用 `ruletable`；③「使用時機」用 `usetable`；④「常見錯誤」用 `errtable`；⑤ 需要時穿插 `note`/`diagram`；⑥ 結尾「小試身手」用 `examples`(題)＋`list`(選項)＋`note`(答案用 `<k>` 標綠)。範本＝「現在簡單式」。
- **細部慣例**：不要出現「FORMULA」字樣；公式**照主詞分行**（don't/doesn't、Do/Does、am/is/are 拆「一般主詞」「第三人稱單數」各一行、同樣大）；label 要括號標主詞涵蓋範圍；`examples` 每種主詞各給句；**術語一律白話解釋**（be 動詞＝am/is/are/was/were…）；**結構隨主詞變化時，除 formula 外一定另加「主詞→用哪個」的 `note`＋`ruletable`**（範本：現在進行式 am/is/are、現在完成式 have/has）。

### 9.4 KK 音標與音節拆解
- 用**標準 KK 符號**（見 `Pronunciation/kk 音標.pdf`）：母音 `e`(name)/`o`(no)、`ɝ`(bird)/`ɚ`(sister)、雙母音 `aɪ/aʊ/ɔɪ`；子音 `g`/`ŋ`/`tʃ`/`dʒ`。**不要**用 IPA 的 `oʊ/eɪ/ː` 或手寫體 `ɡ`。
- 只要單字有 `kk`，網頁第二行即時自動拆解。
- **一律以「劍橋美式」為準**（對應 🇺🇸 Google TTS）。工具 `tools/check-kk.mjs` 內建兩條對齊規則：① **最大合法起始子音**切音節（kr/str/spl… 整組給下一音節：across→ə·ˈkrɑs、instrument→ˈɪn·strə·mənt）；② **AO 母音 cot–caught 合流**（AO 僅接 r 唸 ɔ：for→fɔr、north→nɔrθ；其餘唸 ɑ：across/dog/thought→ɑ）；另修正 CMUdict 把非重音 ER0 單獨成節接母音（director→改 dəˈrɛktɚ）。
- **重建流程**：使用者反映 kk 與發音對不上 → `node tools/check-kk.mjs --write --force`。CMUdict 查不到的片語/專有名詞/整句（OOV，約 177 筆）維持原樣、需人工或逐字查劍橋補。

## 10. 當前狀態速記（換裝置/換 AI 快速接手）
- **前端版本號**：`index.css?v=66` / `index.js?v=66`（改 CSS/JS 記得同步 +1）。
- **單字**：約 1,558 筆；其中 CMUdict 可查的 1,381 筆已用 `--force` 重建、對齊劍橋美式，`kk` 與 `sylKK` 完全一致；177 筆 OOV 維持原樣。`字尾.json` 未載入。
- **文法**：7 大類、41 主題（含第 0 類「文法基礎」）；全面採 formula/ruletable/usetable/errtable 版式；結構隨主詞變化者都附「主詞→用哪個」對照；術語有白話解釋。
- **發音表**：混合方案（母音/鼻音/流音合成、其餘子音唸例字）；速度拖曳桿套用到所有真人發音。
- **測驗**：2×2 四宮格、同列等高、`cn-en` 作答即唸即換題、錯誤清單紅框、中間區置中。
- **TTS**：Worker `https://toeic-tts.fuli62.workers.dev`；金鑰在 Worker Secret；換網址要更新 `ALLOWED_ORIGIN`；Google 專案須開帳單。
- **已知未啟用**：見 §6（真人音檔、image block、返回主頁鈕、字尾.json…）。
- **已知雷區**：見 §9.2（#quizOptions id 權重、大小寫、時間戳、沙盒限制、.git\index.lock）。
