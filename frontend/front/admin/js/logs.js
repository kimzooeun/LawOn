const API_BASE_URL = "http://localhost:8080/api/admin";


document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#logTable tbody");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const modal = document.getElementById("logModal");
  const logDetails = document.getElementById("logDetails");
  const closeBtn = document.querySelector(".close-btn");

  // 샘플 상담 데이터
  const logs = [
    { id: 1, user: "guest01", date: "2025-11-03 14:12", topic: "이혼 절차 안내", emotion: "불안", status: "완료", content: "변호사 선임 시기와 절차를 알고 싶어요..." },
    { id: 2, user: "lawyer77", date: "2025-11-03 13:00", topic: "법적 위자료 청구", emotion: "분노", status: "진행 중", content: "배우자의 외도로 인한 위자료 청구 관련 상담입니다." },
    { id: 3, user: "client42", date: "2025-11-02 18:30", topic: "양육권 분쟁", emotion: "슬픔", status: "중단", content: "아이를 누구와 지낼지 합의가 어렵습니다..." },
    { id: 4, user: "user99", date: "2025-11-01 10:45", topic: "협의이혼 조건", emotion: "중립", status: "완료", content: "협의이혼 시 위자료 없이 가능한가요?" },
  ];

  // 테이블 렌더링
  const renderTable = (filterText = "", filterStatus = "전체") => {
    tableBody.innerHTML = "";
    const filtered = logs.filter(log => {
      const matchesText = log.user.includes(filterText) || log.topic.includes(filterText) || log.content.includes(filterText);
      const matchesStatus = filterStatus === "전체" || log.status === filterStatus;
      return matchesText && matchesStatus;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">검색 결과가 없습니다.</td></tr>`;
      return;
    }

    filtered.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${log.id}</td>
        <td>${log.user}</td>
        <td>${log.date}</td>
        <td>${log.topic}</td>
        <td><span class="emotion">${log.emotion}</span></td>
        <td><span class="status ${getStatusClass(log.status)}">${log.status}</span></td>
        <td><button class="btn-action view" data-id="${log.id}">보기</button></td>
      `;
      tableBody.appendChild(tr);
    });
  };

  // 상태 색상
  const getStatusClass = (status) => {
    if (status === "완료") return "active";
    if (status === "진행 중") return "admin";
    if (status === "중단") return "suspended";
    return "";
  };

  // 초기 렌더
  renderTable();

  // 검색 버튼
  document.getElementById("searchBtn").addEventListener("click", () => {
    const text = searchInput.value.trim();
    const status = statusFilter.value;
    renderTable(text, status);
  });

  // 보기 버튼 이벤트 위임
  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-action.view");
    if (!btn) return;
    const logId = btn.dataset.id;
    const log = logs.find(l => l.id == logId);
    if (log) {
      logDetails.innerHTML = `
        <p><strong>사용자:</strong> ${log.user}</p>
        <p><strong>날짜:</strong> ${log.date}</p>
        <p><strong>상담 주제:</strong> ${log.topic}</p>
        <p><strong>감정 상태:</strong> ${log.emotion}</p>
        <p><strong>상태:</strong> ${log.status}</p>
        <hr>
        <p><strong>상담 내용:</strong><br>${log.content}</p>
      `;
      modal.classList.remove("hidden");
    }
  });

  // 모달 닫기
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  window.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  // 로그아웃
  document.getElementById("logoutBtn").addEventListener("click", () => {
    alert("로그아웃 되었습니다.");
    window.location.href = "../index.html";
  });
});
