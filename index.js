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
