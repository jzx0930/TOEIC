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

// --- 載入 CMUdict ---
let CMU;
try {
  CMU = (await import("cmu-pronouncing-dictionary")).default;
} catch {
  console.error("✗ 找不到 cmu-pronouncing-dictionary，請先： npm install cmu-pronouncing-dictionary hyphen");
  process.exit(1);
}

// --- 連字號（拼寫音節），載入失敗則用簡單後備 ---
let hyphenate = null;
try {
  const mod = await import("hyphen/en");
  hyphenate = mod.hyphenateSync || (mod.default && mod.default.hyphenateSync) || null;
} catch { /* 後備見 splitWordFallback */ }

const __dir = path.dirname(fileURLToPath(import.meta.url));
const WORD_DIR = path.join(__dir, "..", "word");
const WRITE = process.argv.includes("--write");

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

// 把 CMUdict 的 ARPAbet 串轉成「有音節與重音記號的 KK」
function arpaToKK(arpa) {
  const phones = arpa.trim().split(/\s+/);
  // 先組成音節：以母音為核心，子音用「最大起始」原則盡量歸到後一音節
  const nuclei = []; // 每個母音的 index
  phones.forEach((p, i) => { if (isVowelArp(p)) nuclei.push(i); });
  if (!nuclei.length) return null;

  const sylls = []; // {phones:[], stress:"0/1/2"}
  let start = 0;
  for (let k = 0; k < nuclei.length; k++) {
    const vi = nuclei[k];
    const nextVi = (k + 1 < nuclei.length) ? nuclei[k + 1] : phones.length;
    // 這個音節先含到母音；母音後的子音，最後一個之外都先留給下一音節的 onset
    let end;
    const consAfter = nextVi - vi - 1; // 母音到下一母音間的子音數
    if (k === nuclei.length - 1) end = phones.length;      // 最後一節吃到底
    else if (consAfter <= 1) end = vi + 1;                  // 0~1 子音 → 全給下一節 onset
    else end = vi + 1 + (consAfter - 1);                    // 多子音 → 留 1 個 onset 給下一節
    const seg = phones.slice(start, end);
    const stress = (phones[vi].match(/(\d)$/) || [,"0"])[1];
    sylls.push({ phones: seg, stress });
    start = end;
  }

  // 轉成 KK 字串
  return sylls.map(s => {
    const mark = s.stress === "1" ? "ˈ" : s.stress === "2" ? "ˌ" : "";
    const body = s.phones.map(p => {
      const base = p.replace(/\d/g, "");
      const st = (p.match(/(\d)$/) || [,""])[1];
      return isVowelArp(p) ? ARP_VOWEL(base, st) : (ARP_CONS[base] || base.toLowerCase());
    }).join("");
    return mark + body;
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

// 拼寫音節：優先 hyphen，否則簡易後備
function splitWordSpelling(word) {
  if (hyphenate) {
    try {
      const h = hyphenate(word, { hyphenChar: "·" });
      if (h && h.includes("·")) return h;
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
    const arpa = CMU[word.toLowerCase()];
    const kkSylls = arpa ? arpaToKK(arpa) : null;

    if (!arpa) { oob.push(`${file} : ${word}`); }
    else if (item.kk && normKK(item.kk) !== normKK("[" + kkSylls.join("") + "]")) {
      mismatch.push(`${file} : ${word}  你的:${item.kk}   CMUdict:[${kkSylls.join("")}]`);
    }

    if (WRITE) {
      // 缺 KK 的字（例如舊 txt 轉來的）→ 用 CMUdict 補上（照 KK 音標表符號）
      if (!item.kk && kkSylls) item.kk = "[" + kkSylls.join("") + "]";
      item.sylWord = splitWordSpelling(word);
      if (kkSylls) item.sylKK = kkSylls.join("·");
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
