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

      tr.innerHTML = `
        <td>${m.userId}</td>
        <td>${m.nickname || '-'}</td>
        <td>${m.displayName || '-'}</td>
        <td>${m.role || '-'}</td>
        <td>${m.socialProvider || '-'}</td>
        <td>${m.socialId || '-'}</td>
        <td>${m.createdAt ? formatDate(m.createdAt) : '-'}</td>
        <td>${m.updatedAt ? formatDate(m.updatedAt) : '-'}</td>
        <td>${m.withdrawDate ? formatDate(m.withdrawDate) : '-'}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='9'>데이터를 불러올 수 없습니다.</td></tr>";
  }
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} `
       + `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
