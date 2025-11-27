// 메인 초기화
// (DOM 로드 후 이벤트 바인딩 및 앱 실행)

import {
  Modal,
  FormModal,
  updateNicknameDisplay,
  showToast,
  applySidebarCollapsed,
  SIDEBAR_COLLAPSED_KEY,
  STORE_KEY,
  qs,
  state,
  AUTO_SEND_STT,
  loadInitialData,
} from "./utils.js";

import { archiveCurrent, handleSend, renderChat } from "./chat.js";

import "./policy.js";

import { initMypageListeners } from "./mypage.js";
import { bindMic } from "./stt.js";
import { render, initLawyerPageListeners } from "./lawyer.js";

// 페이지 전환 함수
let isLawyerPageInitialized = false;

if (!document.getElementById("chatArea")) {
  window.INIT_STOP = true;
}

// showPage 함수를 동기식으로 변경
export function showPage(pageToShow) {
  const chatArea = document.getElementById("chatArea");
  const mypageExplore = document.getElementById("mypageExplore");
  const lawyerPage = document.getElementById("lawyerPage");
  const inputSec = document.querySelector(".input-section");
  const allPages = [chatArea, mypageExplore, lawyerPage];

  // 모든 페이지 숨기기
  allPages.forEach((page) => page?.classList.add("hidden"));
  inputSec?.classList.add("hidden");

  // 대상 페이지만 즉시 보이기
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
export function openDocModal(title, content, size = "lg") {
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

  // 크기 설정
  cardEl.classList.toggle("modal-card--lg", size === "lg");

  // 내용 채우기
  if (typeof content === "string") {
    bodyEl.innerHTML = content;
  } else if (content instanceof Node) {
    bodyEl.innerHTML = ""; // 기존 내용 비우기
    bodyEl.appendChild(content);
  } else {
    bodyEl.innerHTML = "<p>내용을 불러올 수 없습니다.</p>";
  }

  // 배경 스크롤 잠금
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  // 닫기 핸들러 세팅
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

window.openDocModal = openDocModal;

document.addEventListener("DOMContentLoaded", () => {
  if (window.INIT_STOP) return; // index.html에서는 전체 init 로직을 실행하지 않음
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
  // 헤더 로그아웃 버튼
  const headerLogoutBtn = document.getElementById("headerLogoutBtn");
  headerLogoutBtn?.addEventListener("click", () => {
    Modal.open({
      message: "로그아웃하시겠습니까?",
      okText: "로그아웃",
      cancelText: "취소",
      onConfirm: async () => {
        let apiFailed = false;
        try {
          // API 호출 시도
          const response = await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
          });

          if (!response.ok) {
            apiFailed = true; // API가 200 OK가 아니어도 실패로 간주
          }
        } catch (err) {
          apiFailed = true; // 네트워크 오류 등 API 호출 실패
          console.error("서버 로그아웃 API 호출 실패:", err);
        } finally {
          // API 성공/실패와 관계없이 *항상* 모든 로컬 데이터 삭제

          // utils.js에서 가져온 변수 사용
          localStorage.removeItem(STORE_KEY); // "todak_chats_v1"
          localStorage.removeItem(SIDEBAR_COLLAPSED_KEY); // "todak_sidebar_collapsed"

          // 직접 관리하는 키 삭제
          localStorage.removeItem("todak_nickname");
          localStorage.removeItem("todak_user_id");
          localStorage.removeItem("hard_theme");
          localStorage.removeItem("accessToken");
          sessionStorage.removeItem("accessToken");

          // mypage.js에서 사용하는 키 삭제
          localStorage.removeItem("todak_recents"); //
          localStorage.removeItem("todak_push_enabled"); //

          // 피드백 및 리디렉션
          const toastMsg = apiFailed
            ? "로그아웃. 로컬 데이터만 삭제합니다."
            : "로그아웃 되었습니다.";
          showToast(toastMsg, apiFailed ? "error" : "info", 1500);

          setTimeout(() => {
            window.location.href = "/"; // index.html로 이동
          }, 1600);
        }
      },
    });
  });

  // [추가] 로고 버튼 (Index로 이동)
  const logoBtn = document.getElementById("logoBtn");
  logoBtn?.addEventListener("click", () => {
    window.location.href = "/"; // 메인 페이지로 이동 (로그인 상태 유지)
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
    console.warn(
      "채팅 페이지 전용 DOM 요소가 없어, init.js의 일부 로직을 건너뜁니다."
    );
    return;
  } else {
    // '새 채팅' 버튼
    qs("#newChatBtn").addEventListener("click", () => {
      // archiveCurrent();

      state.currentId = null; // 1. 현재 ID를 null로 설정
      renderChat(); // 2. 빈 채팅 화면을 그림 (DB 호출 없음)

      showPage(chatArea);
    });

    // '마이페이지' 버튼
    qs("#exploreBtn").addEventListener("click", () => {
      showPage(mypageExplore);
    });

    // '마이페이지' -> '채팅으로'
    qs("#mpxBackBtn").addEventListener("click", () => {
      showPage(chatArea);
    });

    // '변호사페이지' 버튼
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

    // '변호사페이지' -> '채팅으로'
    qs("#lawyerBackBtn").addEventListener("click", () => {
      showPage(chatArea);
    });

    // 초기 로드 시 채팅 페이지 기본 표시
    showPage(chatArea);
  }

  qs("#chatForm").addEventListener("submit", handleSend);

  // STT 바인딩: 채팅 화면 마이크
  const chatMicBtn = document.getElementById("micBtn");
  const chatInput = document.getElementById("chatInput");
  if (chatMicBtn && chatInput) {
    bindMic(chatMicBtn, chatInput, AUTO_SEND_STT);
  }
  loadInitialData();
});
