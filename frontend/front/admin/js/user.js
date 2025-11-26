// user.js

import { TokenManager } from '/src/js/token.js';


const API_BASE_URL = "/api/admin/members";

document.addEventListener("DOMContentLoaded", async () => {
  await loadMembers();
});

async function loadMembers() {
  const tbody = document.querySelector("#memberTable tbody");
  tbody.innerHTML = "<tr><td colspan='9'>로딩 중...</td></tr>";

  try {
    const token = TokenManager.getAccessToken();

    const res = await fetch(API_BASE_URL, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      tbody.innerHTML = "<tr><td colspan='9'>권한 없음 또는 서버 오류</td></tr>";
      return;
    }

    const members = await res.json();
    
    tbody.innerHTML = "";
    
    members.forEach(m => {
      const tr = document.createElement("tr");

      // 핵심 수정 부분: 변수명(camelCase)과 (snake_case)를 둘 다 확인
      const createdDate = m.createdAt || m.created_at;
      const updatedDate = m.updatedAt || m.updated_at;

      tr.innerHTML = `
        <td>${m.userId}</td>
        <td>${m.nickname || '-'}</td>
        <td>${m.role || '-'}</td>
        <td>${m.socialProvider || '-'}</td>
        <td>${m.socialId || '-'}</td>
        <td>${formatDate(createdDate)}</td>
        <td>${formatDate(updatedDate)}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='9'>데이터를 불러올 수 없습니다.</td></tr>";
  }
}

// 날짜 포맷팅 헬퍼 함수 (YYYY-MM-DD HH:MM 형식)
function formatDate(dateInput) {
  if (!dateInput) return '-';

  let date;

  // 만약 배열로 들어오면 ([2025, 11, 18, 21, 30]) Date 객체로 변환
  if (Array.isArray(dateInput)) {
    const [y, M, d, h, m, s] = dateInput;
    date = new Date(y, M - 1, d, h || 0, m || 0, s || 0);
  } else {
    // 문자열이나 일반 Date 객체일 때
    date = new Date(dateInput);
  }
  
  // 날짜 변환 실패 시 (NaN 방지)
  if (isNaN(date.getTime())) return '-';

  // YYYY-MM-DD HH:MM 형식으로 직접 조합
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}
