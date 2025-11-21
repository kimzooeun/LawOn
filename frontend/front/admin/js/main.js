import { TokenManager } from '/src/js/token.js';

const DASHBOARD_API = "/api/admin/dashboard";

// 1. 페이지 초기화 및 네비게이션
document.addEventListener("DOMContentLoaded", () => {

  // 1) 토큰 체크
  const token = TokenManager.getAccessToken();
  if (!token) {
    console.warn("토큰 없음 -> 로그인 페이지 이동");
    window.location.href = "/admin/login.html";
    return;
  }

  // 2) 네비게이션 버튼 설정
  setupNavigation();

  // 3) 데이터 로딩 시작 (메인 페이지일 경우만)
  // logTableBody가 존재하는지 확인하여 메인 페이지인지 판단
  if (document.getElementById("logTableBody")) {
      initializeMainPage();
  } else {
      console.log("메인 페이지 아님 (로그 테이블 없음)");
  }
});

function setupNavigation() {
  const buttons = document.querySelectorAll(".admin-nav .page-buttons button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      const routes = {
        main: "/admin/main.html",
        settings: "/admin/settings.html",
        lawyers: "/admin/lawyers.html",
        user: "/admin/user.html",
        logs: "/admin/logs.html"
      };

      if (routes[page]) {
        window.location.href = routes[page];
      } else {
        console.warn("Unknown page:", page);
      }
    });
  });

  // active 효과
  const current = window.location.pathname.split("/").pop().replace(".html", "");
  buttons.forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.page === current) {
      btn.classList.add("active");
    }
  });
}

function initializeMainPage() {
  loadDashboardSummary();
  loadDashboardLogs();
}

// HTML 응답 체크 유틸리티
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


// 2. 상단 요약 데이터 로딩
async function loadDashboardSummary() {
  const token = TokenManager.getAccessToken();

  try {
    const res = await fetch(`${DASHBOARD_API}/summary`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    const data = await safeJson(res);

    if (data.htmlError || data.parseError) {
      console.error("요약 데이터 파싱 오류");
      return;
    }
    applySummaryData(data);

  } catch (err) {
    console.error("대시보드 통신 오류:", err);
  }
}

function applySummaryData(data) {
  const userEl = document.getElementById("userCount");
  const chatEl = document.getElementById("chatCount");
  const lawEl = document.getElementById("lawCount");

  // 백엔드 키: totalMembers, totalSessions, totalLawyers
  // 데이터가 없으면 '-' 표시
  if (userEl) userEl.textContent = data.totalMembers ?? "-";
  // 상담 수: "전체 (오늘)" 형식으로 표시
  if (chatEl) {
      const total = data.totalCounsels ?? 0;
      const today = data.todayCounsels ?? 0;
      chatEl.textContent = `${total} (${today})`;
  }
  if (lawEl) lawEl.textContent = data.totalLawyers ?? "-";
}


// 3. 최근 상담 로그 로드 (핵심 수정 부분)
async function loadDashboardLogs() {
  const tbody = document.getElementById("logTableBody");
  
  if (!tbody) {
      console.warn("❌ logTableBody를 찾을 수 없습니다.");
      return; 
  }

  // 로딩 표시
  tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>데이터를 불러오는 중...</td></tr>";

  try {
    const token = TokenManager.getAccessToken();
    
    // 1. 백엔드에 데이터 요청
    const res = await fetch(`${DASHBOARD_API}/logs`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    if (!res.ok) throw new Error(`로그 로드 실패 (상태코드: ${res.status})`);

    // 2. 데이터 받기
    const logs = await res.json();

    // 3. 화면에 뿌리기
    applyLogData(logs, tbody);

  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>데이터를 불러올 수 없습니다.<br>(콘솔 확인 필요)</td></tr>";
  }
}

function applyLogData(logs, tbody) {
  tbody.innerHTML = "";

  if (!Array.isArray(logs) || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">최근 상담 로그가 없습니다.</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement("tr");

    // 상태값에 따른 스타일
    const statusLabel = log.status === 'ONGOING' ? '진행중' : '종료';
    const statusClass = log.status === 'ONGOING' ? 'status-ongoing' : 'status-completed';

    // HTML 헤더(사용자, 시작시간, 종료시간, 상태)에 맞춰 4개 컬럼만 생성
    tr.innerHTML = `
      <td>${log.nickname || "(알수없음)"}</td>
      <td>${log.startTime}</td>
      <td>${log.endTime || "-"}</td>
      <td><span class="badge ${statusClass}">${statusLabel}</span></td>
    `;

    tbody.appendChild(tr);
  });
}