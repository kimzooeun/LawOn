// 테마 변경
// (사이드바 Footer 테마 변경 기능)

(function () {
  const footer = document.querySelector(".sidebar-footer");
  if (!footer) return;

  const toggleBtn = footer.querySelector(".footer-link");
  if (!toggleBtn) return;

  // 버튼 세트 만들기
  let btnWrap = footer.querySelector("#themeButtons");
  if (!btnWrap) {
    btnWrap = document.createElement("div");
    btnWrap.id = "themeButtons";
    btnWrap.className = "theme-buttons hidden";
    btnWrap.innerHTML = `
      <button class="theme-chip" data-theme="yellow">Yellow</button>
      <button class="theme-chip" data-theme="white">Pink</button>
      <button class="theme-chip" data-theme="purple">Purple</button>
      <button class="theme-chip" data-theme="orange">Orange</button>
      <button class="theme-chip" data-theme="green">Green</button>
      <button class="theme-chip reset" id="themeReset">Reset</button>
    `;
    footer.appendChild(btnWrap);
  }

  // 하드코딩 컬러 세트
  const themes = {
    yellow: {
      bg: "#FFFBEA",
      text: "#3A2A00",
      card: "#FFF2C9",
      accent: "#FFD93D",
    },
    white: {
      bg: "#fffafd",
      text: "#221a2e",
      card: "#ffeef7",
      accent: "#ee90b4",
    },
    purple: {
      bg: "#faf7ff",
      text: "#221a2e",
      card: "#ede7ff",
      accent: "#a27ff7",
    },
    orange: {
      bg: "#fff8f1",
      text: "#3a2a1e",
      card: "#ffe9d6",
      accent: "#fca364",
    },
    green: {
      bg: "#f4fbf7",
      text: "#1f2a24",
      card: "#e6f5ec",
      accent: "#58b48f",
    },
    reset: {
      bg: "#ffffff",
      text: "#1c1c1c",
      card: "#fafafa",
      accent: "#b08d57",
    },
  };

  // 저장된 테마 복원
  const saved = localStorage.getItem("hard_theme");
  if (saved && themes[saved]) applyTheme(saved);

  // 토글 버튼 클릭
  toggleBtn.addEventListener("click", () => {
    btnWrap.classList.toggle("hidden");
  });

  // 테마 선택
  btnWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-chip");
    if (!btn) return;

    const theme =
      btn.dataset.theme || (btn.id === "themeReset" ? "reset" : null);
    if (!theme || !themes[theme]) return;

    applyTheme(theme);
    if (theme === "reset") localStorage.removeItem("hard_theme");
    else localStorage.setItem("hard_theme", theme);
  });

  // 밖 클릭 시 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".sidebar-footer")) btnWrap.classList.add("hidden");
  });

  // 테마 적용 함수
  function applyTheme(name) {
    const t = themes[name];
    if (!t) return;

    const root = document.documentElement; // :root 선택

    // JS로 덮어쓴 모든 스타일을 'unset'으로 되돌려 aaa.css의 기본값이 나오도록 함
    if (name === "reset") {
      const vars = [
        "--bg",
        "--panel",
        "--panel-2",
        "--line",
        "--ink",
        "--ink-muted",
        "--primary",
        "--primary-700",
        "--lavender",
        "--lavender-600",
        "--btn-bg",
        "--btn-bg-hover",
        "--btn-line",
        "--input-bg",
        "--input-line",
        "--focus-ring",
        "--scroll-track",
        "--scroll-thumb",
        "--scroll-thumb-hover",
        "--violet",
      ];

      // CSS 파일의 :root 기본값으로 복원
      vars.forEach((v) => root.style.removeProperty(v));

      return; // 'reset'일 경우 여기서 함수 종료
    }

    // JS 객체(t)의 단순한 4가지 색상을 CSS 변수에 매핑
    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--ink", t.text);
    root.style.setProperty("--panel", t.card);
    root.style.setProperty("--panel-2", t.card);
    root.style.setProperty("--primary", t.accent);
    root.style.setProperty("--primary-700", t.accent);
    root.style.setProperty("--lavender", t.accent);
    root.style.setProperty("--lavender-600", t.accent);
    root.style.setProperty("--violet", t.accent);

    // 버튼/입력창 배경은 흰색으로 고정
    root.style.setProperty("--btn-bg", "#ffffff");
    root.style.setProperty("--input-bg", "#ffffff");

    // Hover 색상을 t.bg(페이지 배경) 대신 t.card(패널 배경) 변경
    root.style.setProperty("--btn-bg-hover", t.card);

    // 라인/테두리 색상
    root.style.setProperty("--line", t.accent + "33");
    root.style.setProperty("--btn-line", t.accent + "55");
    root.style.setProperty("--input-line", t.accent + "55");
    root.style.setProperty("--focus-ring", t.accent + "44");
    root.style.setProperty("--scroll-track", t.bg);
    root.style.setProperty("--scroll-thumb", t.accent + "66");
    root.style.setProperty("--scroll-thumb-hover", t.accent + "88");
  }
})();
