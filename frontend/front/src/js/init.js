// ===================================
// 8. 토닥토닥 [메인 초기화]
// (DOM 로드 후 이벤트 바인딩 및 앱 실행)
// ===================================

// [수정] 페이지 전환 함수 (기존과 동일)
let isLawyerPageInitialized = false;

// [수정] showPage 함수를 동기식으로 변경 (setTimeout 제거)
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

// =======================================================
// ▼▼▼ [핵심 수정] 1. 문서 모달 유틸 전역으로 이동 및 통합 ▼▼▼
// =======================================================
/**
 * 공용 문서 모달을 엽니다.
 * @param {string} title - 모달 제목
 * @param {string|Node} content - 모달 내용 (HTML 문자열 또는 DOM 노드)
 * @param {'lg' | 'default'} [size='lg'] - 모달 크기 ('lg' 또는 'default')
 */
function openDocModal(title, content, size = "lg") {
  // aaa6.js의 ensureDocModal 기능을 여기에 통합
  let modal = document.getElementById("docModal");
  if (!modal) {
    // aaa.html에 이미 정의되어 있지만, 만약을 위한 방어 코드
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
// =======================================================
// ▲▲▲ [핵심 수정] 1. 문서 모달 유틸 전역으로 이동 및 통합 ▲▲▲
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
  Modal.init();

  // [수정] aaa5.js의 기능들을 여기서 초기화 (Modal.init() 이후에)
  if (typeof initMypageListeners === "function") {
    initMypageListeners();
  } else {
    console.error("initMypageListeners 함수를 찾을 수 없습니다. (aaa5.js)");
  }

  // ===== 1. [수정] 닉네임 칩 클릭 시 사용자 정보 모달 (전역 openDocModal 사용) =====
  const nicknameChip = document.getElementById("nicknameDisplay");
  nicknameChip?.addEventListener("click", () => {
    const nick = (localStorage.getItem("todak_nickname") || "게스트").trim();

    // 1. 템플릿 복제
    const template = document.getElementById("userInfoModalTemplate");
    if (!template) {
      console.error("userInfoModalTemplate 템플릿을 찾을 수 없습니다.");
      return;
    }
    const clone = template.content.cloneNode(true);

    // 2. 템플릿에 데이터 채우기
    clone.querySelector(".user-info-nickname").textContent = nick || "게스트";

    // 3. 모달 열기 (DOM 노드를 전달, [수정] size: 'default'로 설정)
    openDocModal("사용자 정보", clone, "default");

    // 4. 모달이 열린 직후, 모달 내부의 버튼에 이벤트 바인딩
    const modalBody = document.getElementById("docModalBody");
    const logoutBtn = modalBody.querySelector("#modalLogoutBtn");

    logoutBtn?.addEventListener("click", () => {
      // 1. 사용자 정보 모달 닫기
      document.getElementById("docModalClose")?.click();

      // 2. (0.1초 후) aaa1.js의 확인 모달(Modal.open) 재활용
      setTimeout(() => {
        Modal.open({
          message: "모든 데이터가 삭제됩니다. 로그아웃하시겠습니까?",
          okText: "로그아웃",
          cancelText: "취소",
          onConfirm: () => {
            // 3. 로컬 스토리지 데이터 삭제
            localStorage.removeItem(STORE_KEY); // (aaa1.js)
            localStorage.removeItem("todak_nickname"); // (aaa1.js)
            localStorage.removeItem("hard_theme"); // (aaa4.js)
            localStorage.removeItem(SIDEBAR_COLLAPSED_KEY); // (aaa1.js)

            // 4. 피드백 및 새로고침
            showToast("로그아웃되었습니다.", "info", 1500);
            setTimeout(() => location.reload(), 1600);
          },
        });
      }, 100);
    });
  });

  // ▶ 접힘 상태 복원
  const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  applySidebarCollapsed(savedCollapsed);

  // ▶ 토글 버튼 핸들러
  const collapseBtn = document.getElementById("collapse-btn");
  collapseBtn?.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const willCollapse = !sidebar.classList.contains("collapsed");
    applySidebarCollapsed(willCollapse);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, willCollapse ? "1" : "0");
  });

  // =======================================================
  // ▼▼▼ [핵심 수정] 3. 페이지 탐색 로직 (변호사 페이지 초기화 추가) ▼▼▼
  // =======================================================
  const chatArea = document.getElementById("chatArea");
  const mypageExplore = document.getElementById("mypageExplore");
  const lawyerPage = document.getElementById("lawyerPage");
  const inputSec = document.querySelector(".input-section");

  if (!chatArea || !mypageExplore || !lawyerPage || !inputSec) {
    console.error("탐색에 필요한 주요 DOM 요소가 없습니다.");
  } else {
    // [수정] 1. '새 채팅' 버튼 (기존 aaa7.js 로직 + 화면 전환)
    qs("#newChatBtn").addEventListener("click", () => {
      archiveCurrent();
      createNewSession();
      showPage(chatArea); // [수정]
    });

    // [수정] 2. '마이페이지' 버튼 (기존 aaa5.js 로직)
    qs("#exploreBtn").addEventListener("click", () => {
      showPage(mypageExplore); // [수정]
    });

    // [수정] 3. '마이페이지' -> '채팅으로' (기존 aaa5.js 로직)
    qs("#mpxBackBtn").addEventListener("click", () => {
      showPage(chatArea); // [수정]
    });

    // [추가] 4. '변호사페이지' 버튼
    qs("#lawyerBtn").addEventListener("click", () => {
      showPage(lawyerPage); // [수정]

      // [핵심 추가] 변호사 페이지 렌더링 함수 및 *초기화* 호출
      // [수정] 초기화 함수를 딱 한 번만 실행하도록 플래그 체크
      if (!isLawyerPageInitialized) {
        if (typeof initLawyerPageListeners === "function") {
          initLawyerPageListeners(); // aaa7.js의 리스너 세팅
          isLawyerPageInitialized = true;
        } else {
          console.error("initLawyerPageListeners 함수를 찾을 수 없습니다.");
        }
      }

      if (typeof render === "function") {
        render(); // aaa7.js의 렌더링 실행
      }
    });

    // [추가] 5. '변호사페이지' -> '채팅으로'
    qs("#lawyerBackBtn").addEventListener("click", () => {
      showPage(chatArea); // [수정]
    });

    // [신규] 초기 로드 시 채팅 페이지 기본 표시
    showPage(chatArea);
  }
  // =======================================================
  // ▲▲▲ [핵심 수정] 3. 페이지 탐색 로직 ▲▲▲
  // =======================================================

  // (기존) 채팅 초기 바인딩
  if (!state.currentId) createNewSession();
  qs("#chatForm").addEventListener("submit", handleSend);

  // [수정] 버튼이 존재하는지 확인하는 IF문 추가 (aaa.html에 #clearRecentsBtn 없음)
  const clearBtn = document.getElementById("clearRecentsBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      Modal.open({
        message: "⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다",
        okText: "전체 삭제",
        cancelText: "취소",
        onConfirm: () => animateAndClearAllRecents(),
      });
    });
  }

  renderChat();

  // STT 바인딩: 채팅 화면 마이크
  const chatMicBtn = document.getElementById("micBtn");
  const chatInput = document.getElementById("chatInput");
  if (chatMicBtn && chatInput) {
    bindMic(chatMicBtn, chatInput, AUTO_SEND_STT);
  }

  // ✅ 닉네임 표시 초기 세팅 + 탭 간 동기화
  updateNicknameDisplay();
  window.addEventListener("storage", (e) => {
    if (e.key === "todak_nickname") updateNicknameDisplay();
  });
});
