// logs.js
import { TokenManager } from '../../src/js/token.js';

document.addEventListener("DOMContentLoaded", () => {
  const token = TokenManager.getAccessToken();

  if (!token) {
    window.location.href = "/admin/login.html";
    return;
  }

  loadCounselLogs();
});

// -------------------------------
// 상담 로그 목록 로딩
// -------------------------------
async function loadCounselLogs() {
  const token = TokenManager.getAccessToken();

  try {
    const res = await fetch("/api/admin/logs", {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      credentials: "include"
    });

    if (res.status === 401) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      return;
    }

    if (!res.ok) throw new Error("상담 로그 불러오기 실패");

    const logs = await res.json();
    renderLogs(logs);

  } catch (err) {
    console.error("상담 로그 로딩 오류:", err);
  }
}

// -------------------------------
// 상담 로그 UI 렌더링
// -------------------------------
function renderLogs(logs) {
  const table = document.getElementById("logsTableBody");
  table.innerHTML = "";

  logs.forEach((log) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${log.id}</td>
      <td>${log.username}</td>
      <td>${log.startTime}</td>
      <td>${log.endTime}</td>
    `;

    table.appendChild(tr);
  });
}
