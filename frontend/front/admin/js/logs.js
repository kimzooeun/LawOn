// logs.js
import { TokenManager } from '/src/js/token.js';

document.addEventListener("DOMContentLoaded", () => {
  const token = TokenManager.getAccessToken();

  if (!token) {
    window.location.href = "/admin/login.html";
    return;
  }

  loadCounselLogs();

  // 검색 이벤트 리스너 등록
    document.getElementById("searchBtn").addEventListener("click", () => {
        loadCounselLogs(true); // 검색 버튼 클릭 시 true 전달
    });
});

// 상담 로그 목록 로딩 (검색 조건 추가)
// isSearch: 검색 버튼 클릭 여부 (새로운 쿼리를 보낼 때 사용)
async function loadCounselLogs(isSearch = false) { 
    const token = TokenManager.getAccessToken();

    // 1. 검색 조건 가져오기
    const searchInput = document.getElementById("searchInput").value.trim();
    const statusFilter = document.getElementById("statusFilter").value;
    
    // 2. 쿼리 파라미터 생성
    const params = new URLSearchParams();
    
    if (searchInput) {
        // 백엔드에서 닉네임(username)으로 검색할 수 있게 파라미터 추가
        params.append("username", searchInput); 
    }
    
    // "전체"가 아닐 경우만 status 파라미터 추가
    if (statusFilter !== "전체") {
        // 백엔드에서 CompletionStatus Enum 이름과 일치하도록 대문자 변환
        params.append("status", statusFilter.toUpperCase());
    }

    // 3. API URL 구성
    const queryString = params.toString();
    const url = `/api/admin/logs${queryString ? '?' + queryString : ''}`;

    try {
        const res = await fetch(url, {
            // (기존 fetch 설정 유지)
        });

        // (기존 에러 처리 로직 유지)
        
        const logs = await res.json();
        renderLogs(logs);

    } catch (err) {
        console.error("상담 로그 로딩 오류:", err);
        // (오류 메시지 처리 유지)
    }
}

// 상담 로그 UI 렌더링
function renderLogs(logs) {
  const table = document.getElementById("logsTableBody");
  
  // HTML에 id="logsTableBody"가 없으면 에러가 나므로 방어 코드 추가
  if (!table) {
    console.error("HTML에서 #logsTableBody 요소를 찾을 수 없습니다.");
    return;
  }
  
  table.innerHTML = "";

  if (logs.length === 0) {
    table.innerHTML = `<tr><td colspan="5" style="text-align:center;">상담 기록이 없습니다.</td></tr>`;
    return;
  }

  logs.forEach((log) => {
    const tr = document.createElement("tr");

    // HTML 헤더 순서: 번호 | 사용자 | 상담 시작 | 상담 종료 | 상태
    // 백엔드 응답 데이터에 status가 없다면 "종료" 등으로 하드코딩하거나 처리 필요
    tr.innerHTML = `
      <td>${log.id}</td>
      <td>${log.nickname}</td>
      <td>${log.startTime}</td>
      <td>${log.endTime ? log.endTime : '-'}</td> 
      <td>${log.status ? log.status : '종료'}</td>
    `;

    table.appendChild(tr);
  });
}