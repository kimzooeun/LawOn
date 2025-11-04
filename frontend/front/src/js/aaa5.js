// ===================================
// 5. 토닥토닥 [마이페이지]
// (탐색형 마이페이지 전환, 검색/필터, 액션)
// ===================================

// === [ADD] 탐색형 마이페이지 전환 & 검색/필터 ===
// [수정] IIFE (즉시실행함수) 대신, aaa8.js에서 호출할 수 있도록 함수로 변경
function initMypageListeners() {
  // 안전 토스트
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) {
      alert(msg);
      return;
    }
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1600);
  }

  const exploreBtn = document.getElementById("exploreBtn");
  const explore = document.getElementById("mypageExplore");
  // [수정] 페이지 이동 로직은 aaa8.js가 담당하므로 관련 변수 및 리스너 제거
  // const chatArea = document.getElementById("chatArea");
  // const inputSec = document.querySelector(".input-section");

  if (!exploreBtn || !explore) return;

  // 버튼 라벨을 '마이페이지'로
  const txt = exploreBtn.querySelector(".nav-text");
  if (txt) txt.textContent = "마이페이지";

  // [수정] 치명적 오류를 일으키는 페이지 이동 리스너 (open/close) 제거
  // exploreBtn.addEventListener("click", open);
  // document.getElementById("mpxBackBtn")?.addEventListener("click", close);

  // 검색/필터
  const searchInput = document.getElementById("mpxSearch");
  const chips = explore.querySelectorAll(".chip");
  // [수정] mpx-card는 존재하지 않으므로, 이 로직은 현재 HTML(aaa.html)과 불일치.
  // 이 기능이 필요하다면 HTML 구조 변경이 필요함. (일단 코드는 유지)
  const cards = Array.from(explore.querySelectorAll(".mpx-card"));
  let currentFilter = "all";

  function applyFilter() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    cards.forEach((card) => {
      const tags = (card.getAttribute("data-tags") || "").toLowerCase();
      const inFilter = currentFilter === "all" || tags.includes(currentFilter);
      const inSearch =
        !q || tags.includes(q) || card.textContent.toLowerCase().includes(q);
      card.style.display = inFilter && inSearch ? "" : "none";
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      currentFilter = chip.dataset.filter || "all";
      applyFilter();
    });
  });
  searchInput?.addEventListener("input", applyFilter);

  // 액션: 프로젝트 로컬 키
  const NICK_KEY = "todak_nickname";
  const PUSH_KEY = "todak_push_enabled";
  const RECENTS_KEY = "todak_recents";
  const CHATS_KEY = "todak_chats_v1"; // [수정] aaa1.js와 키 통일

  // [수정] 존재하지 않는 디테일 패널 로직 제거
  // const detail = document.getElementById("mpxDetail");
  // ...
  // function openDetail(title, innerHTML) { ... }
  // function closeDetail() { ... }
  // detailClose?.addEventListener("click", closeDetail);

  // 카드 액션 핸들러
  explore.addEventListener("click", async (e) => {
    // [수정] HTML 구조에 맞게 셀렉터 변경
    const btn = e.target.closest(".mpx-list-item");
    if (!btn) return;
    const action = btn.dataset.action;

    // 공통 확인창
    // [수정] Modal.open이 aaa1.js에 정의되어 있으므로 사용
    const ask = (msg) => {
      return new Promise((resolve) => {
        Modal.open({
          message: msg,
          okText: "확인",
          cancelText: "취소",
          onConfirm: () => resolve(true),
        });
        // 참고: Modal.js는 '취소'시 false 반환을 지원하지 않음.
      });
    };

    if (action === "open-profile") {
      const current = localStorage.getItem(NICK_KEY) || "";
      // [수정] openDetail 대신 prompt 사용
      const v = prompt("채팅 상단에 표시될 닉네임을 입력하세요.", current);
      if (v !== null) {
        // '취소'가 아닐 때
        localStorage.setItem(NICK_KEY, v.trim());
        // [수정] aaa1.js의 전역 닉네임 업데이트 함수 호출
        if (typeof updateNicknameDisplay === "function") {
          updateNicknameDisplay();
        }
        toast("닉네임 저장 완료");
      }
    } else if (action === "open-security") {
      // [수정] openDetail 대신 Modal.open 사용
      Modal.open({
        message: "이 기능은 데모용입니다.",
        okText: "확인",
        cancelText: "닫기",
      });
    } else if (action === "toggle-push") {
      const on = localStorage.getItem(PUSH_KEY) === "1";
      localStorage.setItem(PUSH_KEY, on ? "0" : "1");
      toast(on ? "알림 OFF" : "알림 ON");
    } else if (action === "clear-chats") {
      // [수정] Modal.open의 콜백 사용
      Modal.open({
        message: "⚠ 삭제 시 되돌릴 수 없습니다. 전체 삭제할까요?",
        okText: "삭제",
        onConfirm: () => {
          localStorage.removeItem(RECENTS_KEY);
          localStorage.removeItem(CHATS_KEY);
          toast("대화 전체 비우기 완료");
          setTimeout(() => location.reload(), 1000); // 새로고침
        },
      });
    } else if (action === "wipe-local") {
      // [수정] Modal.open의 콜백 사용
      Modal.open({
        message: "로컬 저장소 사용자 데이터를 초기화할까요?",
        okText: "초기화",
        onConfirm: () => {
          localStorage.removeItem(NICK_KEY);
          localStorage.removeItem(PUSH_KEY);
          localStorage.removeItem(RECENTS_KEY);
          localStorage.removeItem(CHATS_KEY);
          if (typeof updateNicknameDisplay === "function") {
            updateNicknameDisplay();
          }
          toast("로컬 데이터 초기화 완료");
          setTimeout(() => location.reload(), 1000); // 새로고침
        },
      });
    } else if (action === "open-withdrawal") {
      // (Modal.open 함수는 aaa1.js에 정의되어 있습니다)
      Modal.open({
        title: "회원 탈퇴",
        message:
          "정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.",
        okText: "탈퇴", // 버튼 텍스트
        onConfirm: () => {
          // --- (실제 탈퇴 로직이 여기 들어갑니다) ---
          // (데모) 토스트 메시지만 표시
          toast("회원 탈퇴가 처리되었습니다.");

          // (예시) 1초 후 페이지 새로고침 (로그아웃 효과)
          setTimeout(() => {
            location.reload();
          }, 1000);
        },
      });
    } else if (action === "open-emergency") {
      // [수정] openDetail 대신 Modal.open 사용
      Modal.open({
        title: "긴급 연락",
        message: `112 (경찰/여성폭력)\n119 (화재/구급)\n1393 (자살예방상담)\n1577-0199 (여성긴급전화)`,
        okText: "확인",
        cancelText: "닫기",
      });
    } else if (action === "open-privacy" || action === "open-terms") {
      // [추가] aaa6.js가 처리하도록 이벤트를 전파
      return true;
    }
  });
}
