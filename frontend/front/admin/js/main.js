import { TokenManager } from '/src/js/token.js';


// ===============================
// 🔥 관리자 메뉴 페이지 전환 기능
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".admin-nav .page-buttons button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      // 페이지 매핑
      const routes = {
        main: "/admin/main.html",
        settings: "/admin/settings.html",
        lawyers: "/admin/lawyers.html",
        user: "/admin/user.html",
        logs: "/admin/logs.html"
      };

      // 매핑된 HTML 파일로 이동
      if (routes[page]) {
        window.location.href = routes[page];
      } else {
        console.warn("Unknown page:", page);
      }
    });
  });

  // 🔥 페이지 active 효과 적용
  const current = window.location.pathname.split("/").pop().replace(".html", "");

  buttons.forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.page === current) {
      btn.classList.add("active");
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const token = TokenManager.getAccessToken();

  if (!token) {
    window.location.href = "/admin/login.html";
    return;
  }

  initializeMainPage();
});

function initializeMainPage() {
  console.log("관리자 메인 페이지 로드됨");
  loadDashboardSummary();
  loadDashboardLogs();
}

// HTML 응답 체크
async function safeJson(res) {
  const type = res.headers.get("content-type");
  if (type && type.includes("text/html")) {
    return { htmlError: true };
  }
  try {
    return await res.json();
  } catch {
    return { parseError: true };
  }
}

// 🔹 요약 데이터 로딩
async function loadDashboardSummary() {
  const token = TokenManager.getAccessToken();

  try {
    const res = await fetch("/api/admin/dashboard/summary", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    const data = await safeJson(res);

    if (data.htmlError || data.parseError) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    applySummaryData(data);

  } catch (err) {
    console.error("대시보드 통신 오류:", err);
  }
}

// 🔹 최근 상담 로그
async function loadDashboardLogs() {
  const token = TokenManager.getAccessToken();

  try {
    const res = await fetch("http://localhost:8080/api/admin/dashboard/logs", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    const logs = await safeJson(res);

    if (logs.htmlError || logs.parseError) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    applyLogData(logs);

  } catch (err) {
    console.error("로그 데이터 통신 오류:", err);
  }
}

// HTML에 맞춰 완전 수정된 부분
function applySummaryData(data) {
  // 👉 HTML ID와 맞춰서 수정 완료
  document.getElementById("userCount").textContent = data.totalUsers;
  document.getElementById("chatCount").textContent = data.todayCounsel;
  document.getElementById("lawCount").textContent = data.totalLawyers ?? "-";
}

function applyLogData(logs) {
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">데이터 없음</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${log.username ?? "-"}</td>
      <td>${log.startTime ?? "-"}</td>
      <td>${log.endTime ?? "-"}</td>
      <td>${log.status ?? "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}
