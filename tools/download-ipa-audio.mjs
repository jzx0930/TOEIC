/* =====================================================================
 * download-ipa-audio.mjs — 下載 KK 音素音檔到 Pronunciation/audio/
 * ---------------------------------------------------------------------
 * 音檔來源：Wikimedia Commons 的 IPA 音素錄音（真人單音），
 *          授權 Creative Commons BY-SA 3.0（需標示出處、衍生同授權）。
 *
 * 在「你自己的電腦」跑（需 Node.js 18+，用內建 fetch，不必裝任何套件）：
 *   node tools/download-ipa-audio.mjs
 *   （或雙擊 tools/下載發音音檔.bat）
 *
 * 它會：
 *   1. 逐一用 Commons API 解析每個音素的檔案網址、作者、授權。
 *   2. 下載「轉碼後的 .mp3」到 Pronunciation/audio/<代號>.mp3（失敗則退而抓 .ogg）。
 *   3. 產生 Pronunciation/audio/CREDITS.md（出處與授權，滿足 BY-SA 標示義務）。
 *   4. 印出成功/失敗清單。抓不到的音素，網頁會自動退回「唸例字」。
 *
 * 代號對應網頁 kk-chart.json 的 "audio" 欄位。若某個音素檔名有誤（下載失敗），
 * 把失敗清單貼回來，我改 COMMONS 對照表即可。
 * ===================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, "..", "Pronunciation", "audio");
const UA = "TOEIC-KK-study/1.0 (personal learning project; contact: github)";

// 代號(slug) → Commons 檔名（File: 之後、底線代空白）；值可為字串或「候選清單」
// 單母音／子音用 IPA 單音錄音；雙母音(ai/au/oi)與 r 音化(er/err) 沒有乾淨單音錄音，
// 改用維基詞典的「真人例字錄音」(En-us-單字.ogg)，聲音與畫面顯示的例字一致。
const COMMONS = {
  // 單母音（IPA 單音）
  i:  "Close_front_unrounded_vowel.ogg",
  ih: "Near-close_near-front_unrounded_vowel.ogg",
  e:  "Close-mid_front_unrounded_vowel.ogg",
  eh: "Open-mid_front_unrounded_vowel.ogg",
  ae: "Near-open_front_unrounded_vowel.ogg",
  ah: "Open_back_unrounded_vowel.ogg",
  o:  "Close-mid_back_rounded_vowel.ogg",
  aw: "Open-mid_back_rounded_vowel.ogg",
  u:  "Close_back_rounded_vowel.ogg",
  uu: "Near-close_near-back_rounded_vowel.ogg",
  uh: "Open-mid_back_unrounded_vowel.ogg",
  schwa: "Mid-central_vowel.ogg",
  // r 音化母音（用真人例字）
  er:  "En-us-sister.ogg",
  err: "En-us-bird.ogg",
  // 雙母音（用真人例字）
  ai:  "En-us-fine.ogg",
  au:  "En-us-how.ogg",
  oi:  "En-us-boy.ogg",
  // 子音
  p:  "Voiceless_bilabial_plosive.ogg",
  b:  "Voiced_bilabial_plosive.ogg",
  t:  "Voiceless_alveolar_plosive.ogg",
  d:  "Voiced_alveolar_plosive.ogg",
  k:  "Voiceless_velar_plosive.ogg",
  g:  "Voiced_velar_plosive.ogg",
  f:  "Voiceless_labiodental_fricative.ogg",
  v:  "Voiced_labiodental_fricative.ogg",
  th: "Voiceless_dental_fricative.ogg",
  dh: "Voiced_dental_fricative.ogg",
  s:  "Voiceless_alveolar_sibilant.ogg",
  z:  "Voiced_alveolar_sibilant.ogg",
  sh: "Voiceless_palato-alveolar_sibilant.ogg",
  zh: "Voiced_palato-alveolar_sibilant.ogg",
  ch: "Voiceless_palato-alveolar_affricate.ogg",
  j:  "Voiced_palato-alveolar_affricate.ogg",
  l:  "Alveolar_lateral_approximant.ogg",
  r:  "Alveolar_approximant.ogg",
  m:  "Bilabial_nasal.ogg",
  n:  "Alveolar_nasal.ogg",
  ng: "Velar_nasal.ogg",
  y:  "Palatal_approximant.ogg",
  w:  ["Voiced_labio-velar_approximant.ogg",       // 正確檔名（labio-velar）
       "Voiced_labial-velar_approximant.ogg",
       "Voiced_labiovelar_approximant.ogg"],
  h:  "Voiceless_glottal_fricative.ogg",
};

const stripTags = s => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 有禮貌地抓取：遇到 429/503（流量限制）就等待後重試（尊重 Retry-After，否則指數退避）
async function fetchRetry(url, tries = 6) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < tries; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status !== 429 && r.status !== 503) return r;
    lastStatus = r.status;
    const ra = parseInt(r.headers.get("retry-after") || "", 10);
    const wait = Number.isFinite(ra) ? ra * 1000 : Math.min(20000, 1000 * Math.pow(2, attempt));
    process.stdout.write("~"); // 表示正在等待重試
    await sleep(wait);
  }
  throw new Error("HTTP " + lastStatus + "（多次重試仍被限流）");
}

async function api(title) {
  const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&redirects=1&prop=imageinfo"
          + "&iiprop=url%7Cextmetadata&titles=" + encodeURIComponent("File:" + title);
  const r = await fetchRetry(u);
  if (!r.ok) throw new Error("API " + r.status);
  const j = await r.json();
  const pages = j.query && j.query.pages;
  const page = pages && Object.values(pages)[0];
  if (!page || page.missing !== undefined || !page.imageinfo) throw new Error("找不到檔案頁");
  const ii = page.imageinfo[0];
  const em = ii.extmetadata || {};
  return {
    url: ii.url,
    artist: stripTags(em.Artist && em.Artist.value) || "Wikimedia Commons contributor",
    license: (em.LicenseShortName && em.LicenseShortName.value) || "CC BY-SA",
    licenseUrl: (em.LicenseUrl && em.LicenseUrl.value) || "",
  };
}

async function download(url) {
  const r = await fetchRetry(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return Buffer.from(await r.arrayBuffer());
}

function mp3Url(oggUrl) {
  // https://upload.wikimedia.org/wikipedia/commons/X/YY/Name.ogg
  //   → .../commons/transcoded/X/YY/Name.ogg/Name.ogg.mp3
  const base = oggUrl.replace("/commons/", "/commons/transcoded/");
  const name = decodeURIComponent(oggUrl.split("/").pop());
  return base + "/" + encodeURIComponent(name) + ".mp3";
}

const run = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ok = [], fail = [], credits = [];
  for (const [slug, titleField] of Object.entries(COMMONS)) {
    const titles = Array.isArray(titleField) ? titleField : [titleField]; // 可多個候選檔名
    try {
      // 逐一試候選檔名，第一個查得到的就用
      let info = null, usedTitle = null, lastErr = null;
      for (const t of titles) {
        try { info = await api(t); usedTitle = t; break; }
        catch (e) { lastErr = e; if (titles.length > 1) await sleep(300); }
      }
      if (!info) throw lastErr || new Error("找不到檔案頁");

      let saved;
      try {
        const buf = await download(mp3Url(info.url));
        fs.writeFileSync(path.join(OUT, slug + ".mp3"), buf);
        saved = slug + ".mp3";
      } catch {
        const buf = await download(info.url); // mp3 轉碼不在 → 退而存 .ogg
        fs.writeFileSync(path.join(OUT, slug + ".ogg"), buf);
        saved = slug + ".ogg";
      }
      ok.push(`${slug}  ←  ${usedTitle}  (${saved})`);
      credits.push({ slug, title: usedTitle, ...info });
      process.stdout.write(".");
    } catch (e) {
      fail.push(`${slug}  ←  ${titles[0]}   ✗ ${e.message}`);
      process.stdout.write("x");
    }
    await sleep(700); // 每個音素之間停一下，避免被 Wikimedia 限流(429)
  }
  process.stdout.write("\n\n");

  // 出處檔（滿足 CC BY-SA 標示義務）
  let md = "# 發音音檔出處（Audio credits）\n\n";
  md += "本資料夾的音素音檔取自 **Wikimedia Commons**，授權 **Creative Commons BY-SA 3.0**。\n";
  md += "依授權規定標示原作者與授權；本網站對這些音檔之使用亦以相同方式（BY-SA）分享。\n\n";
  md += "| 代號 | Commons 檔案 | 作者 | 授權 |\n|---|---|---|---|\n";
  for (const c of credits) {
    const link = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(c.title);
    md += `| ${c.slug} | [${c.title}](${link}) | ${c.artist} | ${c.license} |\n`;
  }
  fs.writeFileSync(path.join(OUT, "CREDITS.md"), md, "utf8");

  console.log(`✓ 成功 ${ok.length} 個：`);
  ok.forEach(x => console.log("   " + x));
  if (fail.length) {
    console.log(`\n✗ 失敗 ${fail.length} 個（這些音網頁會自動退回唸例字；把清單貼回給我可修正檔名）：`);
    fail.forEach(x => console.log("   " + x));
  }
  console.log(`\n已寫出：Pronunciation/audio/CREDITS.md`);
  console.log("完成。回網站發音分頁強制重整（Ctrl+F5）即可聽到真人音素音檔。");
};

run().catch(e => { console.error("發生錯誤：", e); process.exit(1); });
