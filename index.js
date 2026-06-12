/* =====================================================================
 * index.js — TOEIC 單字卡網站的「介面互動」腳本
 * ---------------------------------------------------------------------
 * 這支檔案負責的，是「靜態頁面 index.html」上的通用 UI 互動，例如：
 *   1. 章節（section）的進場展開動畫、點擊展開／收合
 *   2. 程式碼區塊（<pre><code>）自動加上「複製程式碼」按鈕
 *   3. 單字卡上「英／中」文字的顯示與隱藏（單張 & 全部）
 *   4. 筆記（note）的全域顯示／隱藏
 *
 * 注意：循環朗讀、抽考測驗、單字卡的動態產生等功能，是寫在
 * index.html 內嵌的 <script> 裡，不在這支檔案中。
 *
 * 本檔為純前端、無外部相依，可直接部署於 GitHub Pages。
 * ===================================================================== */


/* =====================================================================
 * 進入點：等整份 HTML（DOM）載入完成後，才開始初始化所有 UI 元件
 * ---------------------------------------------------------------------
 * 用 DOMContentLoaded 而非 window.onload，是因為我們只需要等 DOM 結構
 * 就緒，不必等圖片等資源全部載完，反應較快。
 * ===================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initUIComponents();
});

/* =========================
   初始化所有 UI 元件
   ─ 集中呼叫各個初始化函式，方便日後增減功能時統一管理
========================= */
function initUIComponents() {
  initSequentialSectionReveal(); // 章節依序展開的進場動畫
  initSectionToggle();           // 章節標題可點擊展開／收合
  initCopyButtons();             // 程式碼區塊自動補上複製按鈕
}

/* =========================
   依序展開章節動畫（進場用）
   ─ 頁面剛載入時，讓每個 <section> 由上而下「一個接一個」展開，
     製造逐段浮現的進場效果。
========================= */
function initSequentialSectionReveal() {
  // 取得頁面上所有章節
  const sections = document.querySelectorAll("section");

  sections.forEach((section, index) => {
    // 取得該章節的標題 <h2>，以及標題裡的箭頭圖示（.arrow）
    const header = section.querySelector("h2");
    const arrow = header?.querySelector(".arrow"); // ?. 避免沒有標題時報錯

    // 先把每個章節設成「收合」狀態，箭頭朝右（▶）表示收合
    section.classList.add("collapsed");
    section.classList.remove("expanded");
    if (arrow) arrow.textContent = "▶";

    // 依索引值延遲展開：第 0 個 0ms、第 1 個 500ms、第 2 個 1000ms…
    // 形成由上而下逐一展開的動畫節奏
    setTimeout(() => {
      section.classList.remove("collapsed");
      section.classList.add("expanded");
      if (arrow) arrow.textContent = "▼"; // 箭頭朝下（▼）表示展開
    }, index * 500);
  });
}

/* =========================
   點擊展開／收合章節（互動用）
   ─ 進場動畫結束後，使用者可隨時點章節標題來自行展開或收合。
========================= */
function initSectionToggle() {
  // 為每個章節標題 <h2> 綁定點擊事件
  document.querySelectorAll("section h2").forEach(header => {
    const arrow = header.querySelector(".arrow");
    header.style.cursor = "pointer"; // 滑鼠移上去顯示可點擊的手指游標

    header.addEventListener("click", () => {
      const section = header.parentElement; // 標題的父層即為該章節
      const isCollapsed = section.classList.contains("collapsed"); // 目前是否為收合

      // 切換 collapsed / expanded 兩個 class（兩者狀態相反）
      section.classList.toggle("collapsed", !isCollapsed);
      section.classList.toggle("expanded", isCollapsed);

      // 同步更新箭頭方向：收合中→展開顯示▼；展開中→收合顯示▶
      if (arrow) arrow.textContent = isCollapsed ? "▼" : "▶";
    });
  });
}

/* =========================
   建立複製按鈕元件
   ─ 產生一顆「複製程式碼」按鈕，點下後把指定文字寫入剪貼簿，
     並短暫顯示「已複製！」作為回饋。
   參數 textSource：可傳字串，或傳一個 DOM 元素（會取其 innerText）
========================= */
function createCopyButton(textSource) {
  const button = document.createElement("button");
  button.className = "copy-btn";
  button.textContent = "複製程式碼";

  button.addEventListener("click", () => {
    // 若 textSource 是字串就直接用，否則取該元素的 innerText
    const text = typeof textSource === "string" ? textSource : textSource.innerText;

    // 寫入系統剪貼簿（需在 https 或 localhost 等安全環境下才可用）
    navigator.clipboard.writeText(text);

    // 切換成「已複製！」的視覺回饋
    button.classList.add("copied");
    button.textContent = "已複製！";

    // 2 秒後恢復原本文字與樣式
    setTimeout(() => {
      button.classList.remove("copied");
      button.textContent = "複製程式碼";
    }, 2000);
  });

  return button;
}

/* =========================
   自動插入複製按鈕
   ─ 掃描頁面上所有的 <pre><code> 程式碼區塊，
     自動在每個區塊前面補上一顆複製按鈕。
========================= */
function initCopyButtons() {
  document.querySelectorAll("pre > code").forEach(codeBlock => {
    // 跳過空白或不存在的程式碼區塊
    if (!codeBlock || !codeBlock.innerText.trim()) return;

    const pre = codeBlock.parentElement;     // 外層 <pre>
    const wrapper = pre.parentElement;       // 再外一層容器（按鈕要放這裡）

    // 若已經加過按鈕就不要重複加（避免重複初始化造成多顆按鈕）
    const hasButton = wrapper.querySelector(".copy-btn");
    if (hasButton) return;

    // 建立按鈕並插入到 <pre> 之前
    const button = createCopyButton(codeBlock);
    wrapper.insertBefore(button, pre);
  });
}




// ======================
// 單字顯示隱藏功能（中英文獨立控制）
// ─ 每張單字卡右上角有「英」「中」兩顆小按鈕，可分別遮住英文或中文，
//   方便使用者自我測驗（遮住答案後再回想）。
// ======================

// 切換單個英文（卡片上的「英」按鈕）
function toggleSingleWord(btn) {
    if (!btn) return;
    const card = btn.closest('.term-card');            // 往上找到所屬的單字卡
    const mainText = card?.querySelector('.main-text'); // 卡片中的英文單字元素

    if (!mainText) return;

    // 切換隱藏狀態（hidden-word 這個 class 由 CSS 負責把文字遮起來）
    mainText.classList.toggle('hidden-word');

    // 依目前是否被隱藏，更新按鈕的圖示與顏色
    if (mainText.classList.contains('hidden-word')) {
        btn.textContent = "🙈";        // 已隱藏 → 顯示「遮眼猴」
        btn.style.color = "#ff5555";   // 紅色提示「目前是隱藏中」
    } else {
        btn.textContent = "英";        // 已顯示 → 還原成「英」
        btn.style.color = "#ffaa00";   // 橘色
    }
}

// 切換單個中文（卡片上的「中」按鈕）
function toggleSingleChinese(btn) {
    if (!btn) return;
    const card = btn.closest('.term-card');               // 往上找到所屬的單字卡
    const translation = card?.querySelector('.translation'); // 卡片中的中文翻譯元素

    if (!translation) return;

    // 切換隱藏狀態（hidden 這個 class 由 CSS 負責遮住翻譯）
    translation.classList.toggle('hidden');

    // 依目前是否被隱藏，更新按鈕的圖示與顏色
    if (translation.classList.contains('hidden')) {
        btn.textContent = "🙈";        // 已隱藏
        btn.style.color = "#ff5555";   // 紅色
    } else {
        btn.textContent = "中";        // 已顯示
        btn.style.color = "#ffcc00";   // 黃色
    }
}

// 全域控制 - 英文
// ─ 由頁面上方的「英 全部顯示／全部隱藏」按鈕呼叫。
//   參數 shouldHide：true=全部隱藏、false=全部顯示
function toggleAllWords(shouldHide) {
    // 一次控制所有英文單字的顯示狀態
    document.querySelectorAll('.main-text').forEach(text => {
        if (shouldHide) {
            text.classList.add('hidden-word');
        } else {
            text.classList.remove('hidden-word');
        }
    });

    // 同步把每張卡片上的「英」按鈕外觀一起更新，保持一致
    document.querySelectorAll('.toggle-en').forEach(btn => {
        if (shouldHide) {
            btn.textContent = "🙈";
            btn.style.color = "#ff5555";
        } else {
            btn.textContent = "英";
            btn.style.color = "#ffaa00";
        }
    });
}

// 全域控制 - 中文
// ─ 由頁面上方的「中 全部顯示／全部隱藏」按鈕呼叫。
//   參數 shouldHide：true=全部隱藏、false=全部顯示
function toggleAllChinese(shouldHide) {
    // 一次控制所有中文翻譯的顯示狀態
    document.querySelectorAll('.translation').forEach(text => {
        if (shouldHide) {
            text.classList.add('hidden');
        } else {
            text.classList.remove('hidden');
        }
    });

    // 同步把每張卡片上的「中」按鈕外觀一起更新，保持一致
    document.querySelectorAll('.toggle-cn').forEach(btn => {
        if (shouldHide) {
            btn.textContent = "🙈";
            btn.style.color = "#ff5555";
        } else {
            btn.textContent = "中";
            btn.style.color = "#ffcc00";
        }
    });
}

// ======================
// 全域控制 - 筆記顯示/隱藏
// ─ 由頁面上方的「📝 全部打開／全部關閉」按鈕呼叫。
//   參數 shouldHide：true=隱藏所有筆記、false=顯示所有筆記
// ======================
function toggleAllNotes(shouldHide) {
    const allNotes = document.querySelectorAll('.note-content'); // 所有筆記內容區塊

    allNotes.forEach(note => {
        if (shouldHide) {
            note.classList.remove('show');     // 移除 show → 隱藏筆記
        } else {
            note.classList.add('show');        // 加上 show → 顯示筆記
        }
    });

    // 同步調整筆記按鈕的透明度，作為「目前是開或關」的視覺提示
    document.querySelectorAll('.note-btn').forEach(btn => {
        btn.style.opacity = shouldHide ? "1" : "0.6";
    });
}
