/* =====================================================================
 * check-kk.mjs — 用開源 CMUdict 檢查單字 KK 是否正確、並自動拆解音節
 * ---------------------------------------------------------------------
 * 這支腳本「在你自己的電腦」跑（沙盒的套件庫被擋，無法在雲端跑）。
 *
 * 用到的開源套件：
 *   - cmu-pronouncing-dictionary：卡內基美隆大學發音辭典（美式，約 13 萬字，
 *     含 ARPAbet 音素與重音標記）。當「標準答案」比對你的 KK。
 *   - hyphen：Frank Liang 的 TeX 連字號演算法，用來把「英文拼寫」切音節。
 *
 * 安裝與執行（在專案根目錄）：
 *   npm init -y                       # 若還沒有 package.json
 *   npm pkg set type=module           # 允許 import 語法
 *   npm install cmu-pronouncing-dictionary hyphen
 *   node tools/check-kk.mjs           # 掃描 word/ 下所有 .json，印出報告
 *   node tools/check-kk.mjs --write   # 另外把 sylWord/sylKK 寫回各單字檔
 *
 * 產出：
 *   - 主控台報告：CMUdict 查不到的字、KK 疑似不一致的字（附建議 KK）。
 *   - 加 --write：在每個單字物件補上 "sylWord" 與 "sylKK"（音節拆解，以 · 分隔），
 *     供網頁第二行顯示（網頁已支援這兩個手動欄位、會覆蓋自動拆解）。
 *
 * 限制（誠實說明）：
 *   - CMUdict 是「美式」發音，驗不了英式；查不到的字（專有名詞、少見字）會列為 OOV。
 *   - 有些字有多種發音，這裡取第一個。
 *   - KK 與 ARPAbet 的對應大致乾淨，但少數符號（如 r 音化母音）可能有風格差異，
 *     報告只是「疑似」清單，最終仍請人工判斷。
 * ===================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- 載入 CMUdict（v3 是具名匯出 dictionary；也相容其他格式）---
let CMU;
try {
  const m = await import("cmu-pronouncing-dictionary");
  CMU = m.dictionary || m.default || (m.default && m.default.dictionary) || m;
} catch {
  console.error("✗ 找不到 cmu-pronouncing-dictionary，請先： npm install cmu-pronouncing-dictionary hyphen");
  process.exit(1);
}
if (!CMU || typeof CMU !== "object" || (!CMU["hello"] && !CMU["HELLO"])) {
  console.error("✗ CMUdict 載入格式異常（取不到字典物件）。請確認套件版本，或把此訊息回報。");
  process.exit(1);
}
// 大小寫皆試，回傳該字的 ARPAbet 字串
const cmuLookup = (word) => {
  const w = word.toLowerCase();
  return CMU[w] || CMU[word] || CMU[word.toUpperCase()] || null;
};
console.log("CMUdict 載入 OK（約 " + Object.keys(CMU).length + " 字）");

// --- 連字號（拼寫音節）：多策略嘗試（子路徑具名／工廠函式），全記錄下來方便診斷 ---
let hyphenateFn = null, hyphenAsync = false;
async function loadHyphen() {
  const tried = [];
  // 策略 1：ESM 需指定到 /index.js（不支援資料夾匯入）
  for (const spec of ["hyphen/en-us/index.js", "hyphen/en/index.js"]) {
    try {
      const m = await import(spec);
      const sync = m.hyphenateSync || (m.default && m.default.hyphenateSync);
      if (typeof sync === "function") return { fn: sync, async: false, how: spec + " hyphenateSync" };
      const asy = m.hyphenate || (m.default && m.default.hyphenate);
      if (typeof asy === "function") return { fn: asy, async: true, how: spec + " hyphenate(async)" };
      tried.push(spec + "：載入但找不到 hyphenate 函式");
    } catch (e) { tried.push(spec + "：" + e.message); }
  }
  // 策略 2：工廠函式 createHyphenator(patterns)；patterns 檔要帶 .js
  try {
    const cm = await import("hyphen/hyphen.js");
    const create = (typeof cm.default === "function" ? cm.default : null) || cm.createHyphenator;
    const pm = await import("hyphen/patterns/en-us.js");
    const patterns = pm.default || pm;
    if (typeof create === "function" && patterns) {
      const fn = create(patterns); // 預設同步
      if (typeof fn === "function") return { fn, async: false, how: "createHyphenator(patterns)" };
    }
    tried.push("factory：createHyphenator 或 patterns 取得失敗");
  } catch (e) { tried.push("factory：" + e.message); }
  return { fn: null, async: false, how: "未載入 → " + tried.join(" ; ") };
}
const H = await loadHyphen();
hyphenateFn = H.fn; hyphenAsync = H.async;
console.log("hyphen 連字號：" + (hyphenateFn ? "OK（" + H.how + "）" : H.how));
if (hyphenateFn) {
  try {
    let t = hyphenateFn("replacement", { hyphenChar: "·" });
    if (hyphenAsync) t = await t;
    console.log("  自我測試 replacement → " + String(t).replace(/­/g, "·"));
  } catch (e) { console.log("  自我測試失敗：" + e.message); }
}

const __dir = path.dirname(fileURLToPath(import.meta.url));
const WORD_DIR = path.join(__dir, "..", "word");
const WRITE = process.argv.includes("--write");
// --force：連「已經有 kk」的字也一律用 CMUdict（美式標準）覆蓋，讓 kk 與 sylKK 完全一致、
//          並與網頁「🇺🇸 美式」Google TTS 對得起來。OOV（CMUdict 查不到，如片語/專有名詞）不動。
const FORCE = process.argv.includes("--force");

// ---------- ARPAbet → KK 對照 ----------
const ARP_CONS = { B:"b",CH:"tʃ",D:"d",DH:"ð",F:"f",G:"g",HH:"h",JH:"dʒ",K:"k",
  L:"l",M:"m",N:"n",NG:"ŋ",P:"p",R:"r",S:"s",SH:"ʃ",T:"t",TH:"θ",V:"v",W:"w",Y:"j",Z:"z",ZH:"ʒ" };
// 母音：依重音（1 主、2 次、0 無）給不同符號者用函式
const ARP_VOWEL = (base, stress) => {
  switch (base) {
    case "AA": return "ɑ"; case "AE": return "æ"; case "AO": return "ɔ";
    case "AW": return "aʊ"; case "AY": return "aɪ"; case "EH": return "ɛ";
    case "EY": return "e"; case "IH": return "ɪ"; case "IY": return "i";
    case "OW": return "o"; case "OY": return "ɔɪ"; case "UH": return "ʊ"; case "UW": return "u";
    case "AH": return stress === "0" ? "ə" : "ʌ";
    case "ER": return stress === "0" ? "ɚ" : "ɝ";
    default: return base.toLowerCase();
  }
};
const isVowelArp = p => /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)/.test(p);

// ---------- 合法的英文「起始子音群」（用來正確切音節：kr/str… 要整組留給下一音節）----------
// 以 ARPAbet 表示，空白分隔。單一子音一律可當起始，故只列 2、3 個子音的合法群。
const ONSET3 = new Set(["S P L","S P R","S T R","S K L","S K R","S K W","S P Y","S T Y","S K Y"]);
const ONSET2 = new Set([
  "P L","P R","P Y","B L","B R","B Y","T R","T W","T Y","D R","D W","D Y",
  "K L","K R","K W","K Y","G L","G R","G W","F L","F R","F Y","V Y",
  "TH R","TH W","SH R","HH Y","M Y","N Y","L Y",
  "S P","S T","S K","S M","S N","S L","S W","S F"
]);
// 回傳「這串子音」尾端有幾個可以合法當下一音節的起始（0~3）
function maxOnset(cons) {
  const n = cons.length;
  if (n === 0) return 0;
  if (n >= 3 && ONSET3.has(cons.slice(n - 3).join(" "))) return 3;
  if (n >= 2 && ONSET2.has(cons.slice(n - 2).join(" "))) return 2;
  return 1; // 單一子音一律可當起始（最大起始原則）
}

// 把 CMUdict 的 ARPAbet 串轉成「有音節與重音記號的 KK」（對齊劍橋美式）
function arpaToKK(arpa) {
  const phones = arpa.trim().split(/\s+/);
  const n = phones.length;
  const base = phones.map(p => p.replace(/\d/g, ""));
  const stressOf = phones.map(p => (p.match(/(\d)$/) || [, "0"])[1]);

  // 先算每個音素的 KK 符號。母音 AO 特別處理：劍橋美式有 cot–caught 合流，
  //   AO 只有「緊接 r」時唸 ɔ（for→fɔr、north→nɔrθ），其餘一律 ɑ（across→əˈkrɑs、dog→dɑg、thought→θɑt）。
  const sym = phones.map((p, i) => {
    if (isVowelArp(base[i])) {
      if (base[i] === "AO") return (i + 1 < n && base[i + 1] === "R") ? "ɔ" : "ɑ";
      return ARP_VOWEL(base[i], stressOf[i]);
    }
    return ARP_CONS[base[i]] || base[i].toLowerCase();
  });

  // 母音核心索引
  const nuclei = [];
  phones.forEach((p, i) => { if (isVowelArp(base[i])) nuclei.push(i); });
  if (!nuclei.length) return null;

  // 分音節：母音後的子音，用「最大合法起始」原則（kr/str… 整組留給下一音節，其餘當本節尾音）
  const sylls = []; // { i0, i1, vi, stress, prefix }
  let start = 0;
  for (let k = 0; k < nuclei.length; k++) {
    const vi = nuclei[k];
    const nextVi = (k + 1 < nuclei.length) ? nuclei[k + 1] : n;
    let end;
    const consAfter = nextVi - vi - 1;
    if (k === nuclei.length - 1) end = n;                 // 最後一節吃到底
    else if (consAfter <= 1) end = vi + 1;                // 0~1 子音 → 全給下一節起始
    else {                                                // 多子音 → 只把合法起始群交給下一節，其餘留本節尾音
      const onset = maxOnset(base.slice(vi + 1, nextVi));
      end = vi + 1 + (consAfter - onset);
    }
    sylls.push({ i0: start, i1: end, vi, stress: stressOf[vi], prefix: "" });
    start = end;
  }

  // 修正：CMUdict 把「非重音 r 音化母音 ER0」單獨成節又接一個母音開頭的音節（director→dɚˈɛktɚ）時，
  //       那個 r 其實是下一音節的起始子音。→ 把 ER0 降成 ə，r 移到下一音節開頭（→ dəˈrɛktɚ、pəˈred）。
  for (let s = 0; s < sylls.length - 1; s++) {
    const cur = sylls[s], nx = sylls[s + 1];
    const lastIdx = cur.i1 - 1;
    if (base[lastIdx] === "ER" && stressOf[lastIdx] === "0" && isVowelArp(base[nx.i0])) {
      sym[lastIdx] = "ə";       // ɚ → ə（留本節）
      nx.prefix += "r";          // r 移到下一音節開頭
    }
  }

  // 組成 KK 字串
  return sylls.map(s => {
    const mark = s.stress === "1" ? "ˈ" : s.stress === "2" ? "ˌ" : "";
    let body = "";
    for (let i = s.i0; i < s.i1; i++) body += sym[i];
    return mark + s.prefix + body;
  });
}

// 正規化：把 KK 字串縮成可比對的核心（去括號/重音/分隔、統一雙母音與長音）
function normKK(kk) {
  return (kk || "")
    .replace(/[\[\]\/·\s]/g, "")
    .replace(/[ˈˌ]/g, "")
    .replace(/ː/g, "")
    .replace(/oʊ/g, "o").replace(/eɪ/g, "e")   // 統一 IPA 雙母音 → KK
    .replace(/ɡ/g, "g");
}

// 拼寫音節：優先 hyphen（sync 或 async 皆可），否則簡易後備
async function splitWordSpelling(word) {
  if (hyphenateFn) {
    try {
      let h = hyphenateFn(word, { hyphenChar: "·" });
      if (hyphenAsync) h = await h;
      if (h) {
        if (h.includes("·")) return h;                              // 有用我們指定的 ·
        if (h.includes("­")) return h.split("­").join("·"); // 預設軟連字號 → 換成 ·
      }
    } catch { /* 落到後備 */ }
  }
  // 後備啟發式（與網頁相同，母音群 + silent-e）
  const w = word.toLowerCase(), isV = c => "aeiouy".includes(c), n = w.length, runs = [];
  for (let i = 0; i < n; i++) { const v = isV(w[i]); if (runs.length && runs.at(-1).v === v) runs.at(-1).end = i + 1; else runs.push({ v, start: i, end: i + 1 }); }
  const vr = runs.filter(r => r.v), cuts = [];
  for (let r = 0; r < runs.length; r++) {
    if (runs[r].v) continue;
    const pv = r > 0 && runs[r - 1].v, nv = r < runs.length - 1 && runs[r + 1].v;
    if (pv && nv) {
      const nr = runs[r + 1];
      if (nr.end === n && w.slice(nr.start, nr.end) === "e" && vr.length >= 2) continue;
      const len = runs[r].end - runs[r].start;
      cuts.push(len === 1 ? runs[r].start : runs[r].start + 1);
    }
  }
  cuts.sort((a, b) => a - b);
  const parts = []; let prev = 0;
  for (const c of cuts) { parts.push(word.slice(prev, c)); prev = c; }
  parts.push(word.slice(prev));
  return parts.filter(Boolean).join("·");
}

// ---------- 主流程 ----------
const files = fs.readdirSync(WORD_DIR).filter(f => f.endsWith(".json") && f !== "list.json");
let total = 0, oob = [], mismatch = [];

for (const file of files) {
  const full = path.join(WORD_DIR, file);
  let arr;
  try { arr = JSON.parse(fs.readFileSync(full, "utf8")); } catch { continue; }
  if (!Array.isArray(arr)) continue;
  let changed = false;

  for (const item of arr) {
    const word = (item.word || "").trim();
    if (!word) continue;
    total++;
    const arpa = cmuLookup(word);
    const kkSylls = arpa ? arpaToKK(arpa) : null;

    if (!arpa) { oob.push(`${file} : ${word}`); }
    else if (item.kk && normKK(item.kk) !== normKK("[" + kkSylls.join("") + "]")) {
      mismatch.push(`${file} : ${word}  你的:${item.kk}   CMUdict:[${kkSylls.join("")}]`);
    }

    if (WRITE && kkSylls) {
      // 有查到 CMUdict：缺 kk 就補；加 --force 連既有 kk 也覆蓋成美式標準。
      // 只有查得到的字才動 kk / sylKK / sylWord；OOV（片語、專有名詞、整句）一律不碰，避免產生亂拆。
      if (!item.kk || FORCE) item.kk = "[" + kkSylls.join("") + "]";
      item.sylKK = kkSylls.join("·");
      item.sylWord = await splitWordSpelling(word);
      changed = true;
    }
  }
  if (WRITE && changed) fs.writeFileSync(full, JSON.stringify(arr, null, 2) + "\n", "utf8");
}

console.log(`\n===== 檢查完成：共 ${total} 字 =====`);
console.log(`\n[1] CMUdict 查不到（OOV，需人工或英式來源）：${oob.length} 字`);
oob.slice(0, 200).forEach(x => console.log("   - " + x));
console.log(`\n[2] KK 疑似不一致（請人工複核）：${mismatch.length} 字`);
mismatch.slice(0, 120).forEach(x => console.log("   - " + x));
if (WRITE) console.log("\n✓ 已用 CMUdict 補上缺少的 KK，並把 sylWord / sylKK 寫回各單字檔（--write）。");
else console.log("\n（加 --write 可補上缺少的 KK 並寫回音節拆解。）");
