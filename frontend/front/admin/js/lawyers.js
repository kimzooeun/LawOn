import { TokenManager } from '../../src/js/token.js';



// === 변호사 등록 / 수정 / 삭제 / 실시간 검색 ===
const API_BASE = "/api/admin/lawyers";

// 바로 DOM 요소 가져옴 (module 스크립트에서는 즉시 접근 가능)
const form = document.getElementById("lawyerForm");
const tableBody = document.querySelector("#lawyerTable tbody");
const searchInput = document.getElementById("searchLawyer");

let editingId = null;
let allLawyers = []; // 전체 목록 캐시

// ===========================
//   이미지 업로드 함수 (수정)
// ===========================
async function uploadImage() {
  const file = document.getElementById("imageFile").files[0];
  if (!file) return null;

  // [삭제] 토큰 가져오기, 유효성 검사 모두 래퍼가 합니다.
  // const token = TokenManager.getAccessToken();
  // if (!token) { ... }

  const formData = new FormData();
  formData.append("image", file);

  // fetch를 그냥 호출하면 래퍼가 알아서 토큰을 넣어줍니다.
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    // [삭제] credentials, headers 모두 래퍼가 설정합니다.
    body: formData
  });

  // 래퍼가 1차로 401을 걸러주지만,
  // 500 에러 등 다른 서버 에러에 대한 방어 코드는 여전히 필요합니다.
  if (!res.ok) {
    throw new Error(`이미지 업로드 실패: ${res.status}`);
  }

  return await res.text();
}

// ===========================
//   등록 & 수정
// ===========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const imageUrl = await uploadImage(); // 이미지 업로드 먼저 수행

  const lawyer = {
    name: document.getElementById("name").value,
    gender: document.getElementById("gender").value,
    detailSpecialty: document.getElementById("detailSpecialty").value,
    description: document.getElementById("description").value,
    office: document.getElementById("office").value,
    officeLocation: document.getElementById("officeLocation").value,
    contact: document.getElementById("contact").value,
    imageUrl: imageUrl
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
    alert(editingId ? `✏️ '${saved.name}' 수정 완료` : `✨ '${saved.name}' 등록 완료`);

    form.reset();
    editingId = null;
    resetSubmitButton();
    loadLawyers();
  } catch (err) {
    console.error(err);
    alert("⚠️ 서버 오류 발생");
  }
});

// ===========================
//   전체 목록 불러오기
// ===========================
async function loadLawyers() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    allLawyers = data;
    renderTable(allLawyers);
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="8">데이터를 불러올 수 없습니다.</td></tr>`;
  }
}

// ===========================
//   실시간 검색 (프론트 필터링)
// ===========================
searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.trim().toLowerCase();

  if (!keyword) {
    renderTable(allLawyers);
    return;
  }

  const filtered = allLawyers.filter(l =>
    (l.name && l.name.toLowerCase().includes(keyword)) ||
    (l.detailSpecialty && l.detailSpecialty.toLowerCase().includes(keyword)) ||
    (l.office && l.office.toLowerCase().includes(keyword)) ||
    (l.officeLocation && l.officeLocation.toLowerCase().includes(keyword)) ||
    (l.contact && l.contact.toLowerCase().includes(keyword)) ||
    (l.description && l.description.toLowerCase().includes(keyword))
  );

  renderTable(filtered);
});

// ===========================
//   테이블 렌더링
// ===========================
function renderTable(list) {
  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">등록된 변호사가 없습니다.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(l => `
    <tr data-id="${l.id}">
      <td>${l.name}</td>
      <td>${l.gender}</td>
      <td>${l.detailSpecialty}</td>
      <td>${l.description}</td>
      <td>${l.office}</td>
      <td>${l.officeLocation || '-'}</td>
      <td>${l.contact}</td>
      <td>
        <button class="edit-btn" data-id="${l.id}">✏️ 수정</button>
        <button class="delete-btn" data-id="${l.id}">🗑 삭제</button>
      </td>
    </tr>
  `).join("");

  // 삭제 버튼
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

  // 수정 버튼
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const lawyer = list.find(l => l.id == id);
      fillFormForEdit(lawyer);
    });
  });
}

// ===========================
//   수정 모드 폼 채우기
// ===========================
function fillFormForEdit(lawyer) {
  document.getElementById("name").value = lawyer.name;
  document.getElementById("gender").value = lawyer.gender;
  document.getElementById("detailSpecialty").value = lawyer.detailSpecialty;
  document.getElementById("description").value = lawyer.description;
  document.getElementById("office").value = lawyer.office;
  document.getElementById("officeLocation").value = lawyer.officeLocation;
  document.getElementById("contact").value = lawyer.contact;

  editingId = lawyer.id;

  const submitBtn = document.querySelector("#lawyerForm button[type='submit']");
  submitBtn.textContent = "✏️ 수정 완료";
  submitBtn.style.background = "#f9a825";
  submitBtn.style.color = "#fff";
}

// ===========================
//   버튼 초기화
// ===========================
function resetSubmitButton() {
  const submitBtn = document.querySelector("#lawyerForm button[type='submit']");
  submitBtn.textContent = "등록";
  submitBtn.style.background = "";
  submitBtn.style.color = "";
}

// ===========================
//   초기 로드
// ===========================
loadLawyers();
