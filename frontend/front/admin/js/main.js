/* ==========================================================
   🌸 로그인 상태 유지 로직
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const isLogin = localStorage.getItem("adminLogin");
  const path = window.location.pathname;
  const isLoginPage = path.includes("login.html");

  // 1️⃣ 로그인 안 돼 있고, 현재 페이지가 login.html이 아니면 → 로그인 페이지로
  if (!isLogin && !isLoginPage) {
    console.warn("로그인 상태 아님 → login.html로 이동");
    window.location.href = "/admin/login.html";
    return;
  }

  // 2️⃣ 로그인돼 있는데 login.html 들어가면 → main.html로 리다이렉트
  if (isLogin && isLoginPage) {
    window.location.href = "/admin/main.html";
    return;
  }
});

/* ==========================================================
   🌸 페이지 이동 버튼 + active 표시
   ========================================================== */
document.querySelectorAll(".page-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.page;
    const pages = {
      main: "/admin/main.html",
      settings: "/admin/settings.html",
      lawyers: "/admin/lawyers.html",
      log: "/admin/logs.html",
      user: "/admin/user.html"
    };

    const isLogin = localStorage.getItem("adminLogin");
    if (!isLogin) {
      alert("로그인이 필요합니다.");
      window.location.href = "/admin/login.html";
      return;
    }

    if (pages[target]) {
      window.location.href = pages[target];
    }
  });
});

// ✅ 현재 페이지 active 버튼 표시
const current = window.location.pathname.split("/").pop().replace(".html", "");
const activeBtn = document.querySelector(`.page-buttons button[data-page="${current}"]`);
if (activeBtn) activeBtn.classList.add("active");

/* ==========================================================
   🌸 로그아웃
   ========================================================== */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminLogin");
    alert("로그아웃 되었습니다.");
    window.location.href = "/admin/login.html";
  });
}

/* ==========================================================
   📊 대시보드 기능 (요약 + 최근 로그 + 자동 새로고침)
   ========================================================== */

const API_BASE = "http://localhost:8080/api/admin/dashboard";
let prevDashboard = {};
let prevLogs = [];

// ✅ 데이터 새로고침 (요약 + 로그)
async function refreshDashboard() {
  await Promise.all([loadDashboard(), loadRecentLogs()]);
  console.info("🔄 대시보드 자동 갱신 완료 (" + new Date().toLocaleTimeString() + ")");
}

// ✅ 대시보드 요약 데이터
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/summary`);
    const data = await res.json();

    document.getElementById("userCount").textContent = data.userCount ?? "-";
    document.getElementById("lawCount").textContent = data.lawyerCount ?? "-";

    const total = data.chatTotalCount ?? 0;
    const today = data.chatTodayCount ?? 0;
    document.getElementById("chatCount").textContent = `${total}건 (${today}건 오늘)`;

  } catch (err) {
    console.error("대시보드 요약 불러오기 실패:", err);
  }
}

// ✅ 카드 숫자 변경 시 애니메이션 효과
function updateValue(id, newValue) {
  const el = document.getElementById(id);
  const oldValue = prevDashboard[id];
  el.textContent = newValue ?? "-";

  if (oldValue !== undefined && oldValue !== newValue) {
    el.classList.add("updated");
    setTimeout(() => el.classList.remove("updated"), 1000);
  }
}

// ✅ 최근 회원 이용 내역
async function loadRecentLogs() {
  try {
    const res = await fetch(`${API_BASE}/recent-logs`);
    const data = await res.json();

    const tableBody = document.getElementById("logTableBody");

    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">기록이 없습니다.</td></tr>`;
      return;
    }

    // 이전 로그와 비교해 새 데이터 강조
    const prevIds = prevLogs.map(l => l.id);
    tableBody.innerHTML = data.map(log => {
      const isNew = !prevIds.includes(log.id);
      return `
        <tr class="${isNew ? "new-row" : ""}">
          <td>${log.userNickname || log.userId || "익명"}</td>
          <td>${formatDate(log.startTime)}</td>
          <td>${formatDate(log.endTime)}</td>
          <td>${log.status || "-"}</td>
        </tr>
      `;
    }).join("");

    prevLogs = data;
  } catch (err) {
    console.error("최근 이용내역 불러오기 실패:", err);
  }
}

// ✅ 날짜 포맷 함수
function formatDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 
          ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ==========================================================
   🚀 페이지 로드 시 초기 실행 + 자동 새로고침
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("main.html")) {
    refreshDashboard();                  // 초기 로드
    setInterval(refreshDashboard, 10000); // 10초마다 갱신
  }
});
