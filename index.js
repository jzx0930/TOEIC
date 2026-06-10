document.addEventListener("DOMContentLoaded", () => {
  initUIComponents();
});

/* =========================
   初始化所有 UI 元件
========================= */
function initUIComponents() {
  initSequentialSectionReveal();
  initSectionToggle();
  initCopyButtons();
}

/* =========================
   依序展開章節動畫（進場用）
========================= */
function initSequentialSectionReveal() {
  const sections = document.querySelectorAll("section");

  sections.forEach((section, index) => {
    const header = section.querySelector("h2");
    const arrow = header?.querySelector(".arrow");

    section.classList.add("collapsed");
    section.classList.remove("expanded");
    if (arrow) arrow.textContent = "▶";

    setTimeout(() => {
      section.classList.remove("collapsed");
      section.classList.add("expanded");
      if (arrow) arrow.textContent = "▼";
    }, index * 500);
  });
}

/* =========================
   點擊展開／收合章節（互動用）
========================= */
function initSectionToggle() {
  document.querySelectorAll("section h2").forEach(header => {
    const arrow = header.querySelector(".arrow");
    header.style.cursor = "pointer";

    header.addEventListener("click", () => {
      const section = header.parentElement;
      const isCollapsed = section.classList.contains("collapsed");
      section.classList.toggle("collapsed", !isCollapsed);
      section.classList.toggle("expanded", isCollapsed);
      if (arrow) arrow.textContent = isCollapsed ? "▼" : "▶";
    });
  });
}

/* =========================
   建立複製按鈕元件
========================= */
function createCopyButton(textSource) {
  const button = document.createElement("button");
  button.className = "copy-btn";
  button.textContent = "複製程式碼";

  button.addEventListener("click", () => {
    const text = typeof textSource === "string" ? textSource : textSource.innerText;
    navigator.clipboard.writeText(text);
    button.classList.add("copied");
    button.textContent = "已複製！";
    setTimeout(() => {
      button.classList.remove("copied");
      button.textContent = "複製程式碼";
    }, 2000);
  });

  return button;
}

/* =========================
   自動插入複製按鈕
========================= */
function initCopyButtons() {
  document.querySelectorAll("pre > code").forEach(codeBlock => {
    if (!codeBlock || !codeBlock.innerText.trim()) return;

    const pre = codeBlock.parentElement;
    const wrapper = pre.parentElement;

    const hasButton = wrapper.querySelector(".copy-btn");
    if (hasButton) return;

    const button = createCopyButton(codeBlock);
    wrapper.insertBefore(button, pre);
  });
}




// ======================
// 單字顯示隱藏功能（中英文獨立控制）
// ======================

// 切換單個英文（英 按鈕）
function toggleSingleWord(btn) {
    if (!btn) return;
    const card = btn.closest('.term-card');
    const mainText = card?.querySelector('.main-text');
   
    if (!mainText) return;
   
    mainText.classList.toggle('hidden-word');
   
    if (mainText.classList.contains('hidden-word')) {
        btn.textContent = "🙈";
        btn.style.color = "#ff5555";
    } else {
        btn.textContent = "英";
        btn.style.color = "#ffaa00";
    }
}

// 切換單個中文（中 按鈕）
function toggleSingleChinese(btn) {
    if (!btn) return;
    const card = btn.closest('.term-card');
    const translation = card?.querySelector('.translation');
   
    if (!translation) return;
   
    translation.classList.toggle('hidden');
   
    if (translation.classList.contains('hidden')) {
        btn.textContent = "🙈";
        btn.style.color = "#ff5555";
    } else {
        btn.textContent = "中";
        btn.style.color = "#ffcc00";
    }
}

// 全域控制 - 英文
function toggleAllWords(shouldHide) {
    // 控制所有英文單字
    document.querySelectorAll('.main-text').forEach(text => {
        if (shouldHide) {
            text.classList.add('hidden-word');
        } else {
            text.classList.remove('hidden-word');
        }
    });
    
    // 同步更新所有「英」按鈕
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
function toggleAllChinese(shouldHide) {
    // 控制所有中文翻譯
    document.querySelectorAll('.translation').forEach(text => {
        if (shouldHide) {
            text.classList.add('hidden');
        } else {
            text.classList.remove('hidden');
        }
    });
    
    // 同步更新所有「中」按鈕
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
// ======================
function toggleAllNotes(shouldHide) {
    const allNotes = document.querySelectorAll('.note-content');
    
    allNotes.forEach(note => {
        if (shouldHide) {
            note.classList.remove('show');     // 隱藏筆記
        } else {
            note.classList.add('show');        // 顯示筆記
        }
    });
    
    // 同步改變筆記按鈕的透明度（視覺提示）
    document.querySelectorAll('.note-btn').forEach(btn => {
        btn.style.opacity = shouldHide ? "1" : "0.6";
    });
}
