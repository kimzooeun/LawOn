// ===================================
// 8. 메인 초기화
// (DOM 로드 후 이벤트 바인딩 및 앱 실행)
// ===================================

// 페이지 전환 함수
let isLawyerPageInitialized = false;

// showPage 함수를 동기식으로 변경
function showPage(pageToShow) {
  const chatArea = document.getElementById("chatArea");
  const mypageExplore = document.getElementById("mypageExplore");
  const lawyerPage = document.getElementById("lawyerPage");
  const inputSec = document.querySelector(".input-section");
  const allPages = [chatArea, mypageExplore, lawyerPage];

  // 1. 모든 페이지 숨기기
  allPages.forEach((page) => page?.classList.add("hidden"));
  inputSec?.classList.add("hidden");

  // 2. 대상 페이지만 즉시 보이기
  if (pageToShow) {
    pageToShow.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // 채팅 페이지일 때만 입력창 보이기
  if (pageToShow === chatArea) {
    inputSec?.classList.remove("hidden");
  }
}

// 문서 모달 유틸 전역으로 이동 및 통합
/**
 * 공용 문서 모달을 엽니다.
 * @param {string} title - 모달 제목
 * @param {string|Node} content - 모달 내용
 * @param {'lg' | 'default'} [size='lg'] - 모달 크기
 */
function openDocModal(title, content, size = "lg") {
  let modal = document.getElementById("docModal");
  if (!modal) {
    console.warn("#docModal이 없어 동적으로 생성합니다.");
    const html = `
      <div id="docModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="docModalTitle" aria-describedby="docModalBody">
        <div class="modal-backdrop"></div>
        <div class="modal-card modal-card--lg" role="document">
          <header class="modal-header">
            <h3 id="docModalTitle" class="modal-title">문서</h3>
            <button id="docModalClose" class="btn ghost" type="button" aria-label="닫기">✕</button>
          </header>
          <div id="docModalBody" class="modal-scroll"></div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    modal = document.getElementById("docModal");
  }

  const titleEl = document.getElementById("docModalTitle");
  const bodyEl = document.getElementById("docModalBody");
  const cardEl = modal.querySelector(".modal-card");

  if (!modal || !titleEl || !bodyEl || !cardEl) {
    console.error("문서 모달의 필수 요소를 찾을 수 없습니다.");
    return;
  }

  titleEl.textContent = title;

  // 1. 크기 설정
  cardEl.classList.toggle("modal-card--lg", size === "lg");

  // 2. 내용 채우기
  if (typeof content === "string") {
    bodyEl.innerHTML = content;
  } else if (content instanceof Node) {
    bodyEl.innerHTML = ""; // 기존 내용 비우기
    bodyEl.appendChild(content);
  } else {
    bodyEl.innerHTML = "<p>내용을 불러올 수 없습니다.</p>";
  }

  // 3. 배경 스크롤 잠금
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  // 4. 닫기 핸들러 세팅
  const closeBtn = document.getElementById("docModalClose");
  const backdrop = modal.querySelector(".modal-backdrop");

  const cleanup = () => {
    modal.classList.add("hidden");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    // 이벤트 리스너 제거 (중복 방지)
    closeBtn?.removeEventListener("click", cleanup);
    backdrop?.removeEventListener("click", cleanup);
    document.removeEventListener("keydown", escHandler);
  };

  const escHandler = (e) => {
    if (e.key === "Escape") cleanup();
  };

  closeBtn?.addEventListener("click", cleanup);
  backdrop?.addEventListener("click", cleanup);
  document.addEventListener("keydown", escHandler);

  modal.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  Modal.init();
  FormModal.init();

  // 앱 로드 시 닉네임 즉시 반영
  if (typeof updateNicknameDisplay === "function") {
    updateNicknameDisplay();
  }

  // 마이페이지 리스너 초기화
  if (typeof initMypageListeners === "function") {
    initMypageListeners();
  } else {
    console.error("initMypageListeners 함수를 찾을 수 없습니다. (aaa5.js)");
  }
  // ===== 1. 헤더 로그아웃 버튼 =====
  const headerLogoutBtn = document.getElementById("headerLogoutBtn");
  headerLogoutBtn?.addEventListener("click", () => {
    Modal.open({
      message: "로그아웃하시겠습니까?",
      okText: "로그아웃",
      cancelText: "취소",
      onConfirm: () => {
        // 로컬 스토리지 데이터 삭제
        localStorage.removeItem(STORE_KEY);
        localStorage.removeItem("todak_nickname");
        localStorage.removeItem("hard_theme");
        localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);

        // 피드백 및 새로고침
        showToast("로그아웃되었습니다.", "info", 1500);
        setTimeout(() => location.reload(), 1600);
      },
    });
  });

  // 접힘 상태 복원
  const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  applySidebarCollapsed(savedCollapsed);

  // 토글 버튼 핸들러
  const collapseBtn = document.getElementById("collapse-btn");
  collapseBtn?.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const willCollapse = !sidebar.classList.contains("collapsed");
    applySidebarCollapsed(willCollapse);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, willCollapse ? "1" : "0");
  });

  // 페이지 탐색 로직 (변호사 페이지 초기화 추가)
  const chatArea = document.getElementById("chatArea");
  const mypageExplore = document.getElementById("mypageExplore");
  const lawyerPage = document.getElementById("lawyerPage");
  const inputSec = document.querySelector(".input-section");

  if (!chatArea || !mypageExplore || !lawyerPage || !inputSec) {
    console.error("탐색에 필요한 주요 DOM 요소가 없습니다.");
  } else {
    // 1. '새 채팅' 버튼
    qs("#newChatBtn").addEventListener("click", () => {
      archiveCurrent();
      createNewSession();
      showPage(chatArea);
    });

    // 2. '마이페이지' 버튼
    qs("#exploreBtn").addEventListener("click", () => {
      showPage(mypageExplore);
    });

    // 3. '마이페이지' -> '채팅으로'
    qs("#mpxBackBtn").addEventListener("click", () => {
      showPage(chatArea);
    });

    // 4. '변호사페이지' 버튼
    qs("#lawyerBtn").addEventListener("click", () => {
      showPage(lawyerPage);

      // 변호사 페이지 렌더링 함수 및 초기화 호출 -> 초기화 함수를 딱 한 번만 실행하도록 플래그 체크
      if (!isLawyerPageInitialized) {
        if (typeof initLawyerPageListeners === "function") {
          initLawyerPageListeners();
          isLawyerPageInitialized = true;
        } else {
          console.error("initLawyerPageListeners 함수를 찾을 수 없습니다.");
        }
      }

      if (typeof render === "function") {
        render();
      }
    });

    // 5. '변호사페이지' -> '채팅으로'
    qs("#lawyerBackBtn").addEventListener("click", () => {
      showPage(chatArea);
    });

    // 초기 로드 시 채팅 페이지 기본 표시
    showPage(chatArea);
  }

  // 채팅 초기 바인딩
  if (!state.currentId) createNewSession();
  qs("#chatForm").addEventListener("submit", handleSend);

  // 기존 채팅 렌더링
  renderChat();

  // STT 바인딩: 채팅 화면 마이크
  const chatMicBtn = document.getElementById("micBtn");
  const chatInput = document.getElementById("chatInput");
  if (chatMicBtn && chatInput) {
    bindMic(chatMicBtn, chatInput, AUTO_SEND_STT);
  }
});
