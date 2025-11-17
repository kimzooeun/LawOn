// === 변호사 등록 / 수정 / 삭제 / 실시간 검색 ===
const API_BASE = "http://localhost:8080/api/admin/lawyers";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lawyerForm");
  const tableBody = document.querySelector("#lawyerTable tbody");
  const searchInput = document.getElementById("searchLawyer");
  let editingId = null;
  let allLawyers = []; // 전체 목록 캐시

  // ✅ 등록 & 수정
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const lawyer = {
      name: document.getElementById("name").value,
      specialty: document.getElementById("specialty").value,
      office: document.getElementById("office").value,
      officeLocation: document.getElementById("officeLocation").value,
      contact: document.getElementById("contact").value,
    };

    try {
      let res;
      if (editingId) {
        // ✏️ 수정
        res = await fetch(`${API_BASE}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lawyer),
        });
      } else {
        // ➕ 신규 등록
        res = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lawyer),
        });
      }

      if (!res.ok) throw new Error("등록/수정 실패");
      const saved = await res.json();
      alert(editingId ? `✅ '${saved.name}' 수정 완료` : `✅ '${saved.name}' 등록 완료`);

      form.reset();
      editingId = null;
      resetSubmitButton();
      loadLawyers();
    } catch (err) {
      console.error(err);
      alert("⚠️ 서버 오류 발생");
    }
  });

  // ✅ 전체 목록 불러오기
  async function loadLawyers() {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      allLawyers = data; // 캐시에 저장
      renderTable(allLawyers);
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="6">데이터를 불러올 수 없습니다.</td></tr>`;
    }
  }

  // ✅ 실시간 검색 이벤트
  searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value.trim().toLowerCase();

    if (!keyword) {
      renderTable(allLawyers); // 입력 없으면 전체 표시
      return;
    }

    // 프론트 쪽 필터링 (서버 요청 X)
    const filtered = allLawyers.filter(l =>
      (l.name && l.name.toLowerCase().includes(keyword)) ||
      (l.specialty && l.specialty.toLowerCase().includes(keyword)) ||
      (l.office && l.office.toLowerCase().includes(keyword)) ||
      (l.officeLocation && l.officeLocation.toLowerCase().includes(keyword)) ||
      (l.contact && l.contact.toLowerCase().includes(keyword))
    );

    renderTable(filtered);
  });

  // ✅ 테이블 렌더링
  function renderTable(list) {
    if (!list.length) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">검색 결과가 없습니다.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(l => `
      <tr data-id="${l.id}">
        <td>${l.name}</td>
        <td>${l.specialty}</td>
        <td>${l.office}</td>
        <td>${l.officeLocation || '-'}</td>
        <td>${l.contact}</td>
        <td>
          <button class="edit-btn" data-id="${l.id}">✏️ 수정</button>
          <button class="delete-btn" data-id="${l.id}">🗑 삭제</button>
        </td>
      </tr>
    `).join("");

    // 삭제 이벤트
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (confirm("정말 삭제하시겠습니까?")) {
          await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
          alert("🗑 삭제 완료");
          loadLawyers();
        }
      });
    });

    // 수정 이벤트
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        const lawyer = list.find(l => l.id == id);
        fillFormForEdit(lawyer);
      });
    });
  }

  // ✅ 수정모드 폼 채우기
  function fillFormForEdit(lawyer) {
    document.getElementById("name").value = lawyer.name;
    document.getElementById("specialty").value = lawyer.specialty;
    document.getElementById("office").value = lawyer.office;
    document.getElementById("officeLocation").value = lawyer.officeLocation;
    document.getElementById("contact").value = lawyer.contact;

    editingId = lawyer.id;

    const submitBtn = document.querySelector("#lawyerForm button[type='submit']");
    submitBtn.textContent = "✏️ 수정 완료";
    submitBtn.style.backgroundColor = "#f9a825";
    submitBtn.style.color = "#fff";
  }

  // ✅ 등록버튼 원상복귀
  function resetSubmitButton() {
    const submitBtn = document.querySelector("#lawyerForm button[type='submit']");
    submitBtn.textContent = "등록";
    submitBtn.style.backgroundColor = "";
    submitBtn.style.color = "";
  }

  // ✅ 페이지 로드시 전체 목록 로드
  loadLawyers();
});
