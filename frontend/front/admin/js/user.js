const API_BASE_URL = "http://localhost:8080/api/admin";

document.addEventListener("DOMContentLoaded", async () => {
  await loadMembers();
});

async function loadMembers() {
  const tbody = document.querySelector("#memberTable tbody");
  tbody.innerHTML = "<tr><td colspan='5'>로딩 중...</td></tr>";

  try {
    const res = await fetch(API_BASE);
    const members = await res.json();

    tbody.innerHTML = "";
    members.forEach(m => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.id}</td>
        <td>${m.nickname || '-'}</td>
        <td>${m.role}</td>
        <td>${new Date(m.createdAt).toLocaleDateString()}</td>
        <td>${m.withdrawDate ? new Date(m.withdrawDate).toLocaleDateString() : '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='5'>데이터를 불러올 수 없습니다.</td></tr>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const goUserPageBtn = document.getElementById("goUserPageBtn");

  if (goUserPageBtn) {
    goUserPageBtn.addEventListener("click", () => {
      window.location.href = "user.html";
    });
  }
});