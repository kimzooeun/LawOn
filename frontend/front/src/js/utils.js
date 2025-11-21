// ===================================
// 1. 상태 & 유틸
// (전역 변수, 스토리지, 모달, 토스트, 닉네임)
// ===================================

import { getInitialData } from "./api.js";
import { renderChat } from "./chat.js";

export const STORE_KEY = "todak_chats_v1";
export const STT_ENDPOINT = "/stt";
export const AUTO_SEND_STT = true;

// 간단한 쿼리 셀렉터 유틸
export const qs = (s, r = document) => r.querySelector(s);

// 사이드바 접힘 상태 로컬스토리지 키
export const SIDEBAR_COLLAPSED_KEY = "todak_sidebar_collapsed";

// 접힘/펼침 적용 함수
export function applySidebarCollapsed(collapsed) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.classList.toggle("collapsed", !!collapsed);
}

// == 비어있는 스토어 ==
export function createEmptyStore() {
  return { recents: [], sessions: {}, currentId: null, isSending: false }; // 👈 isSending 추가
}

// ---- 스토리지 로드/저장 ----
export let state = createEmptyStore(); // 일단 빈 상태로 시작

export async function loadInitialData() {
  // [수정 1] 전송 중이면 아예 시작도 하지 않음
  if (state.isSending) return;

  try {
    // 1. 사용자가 현재 보고 있던 방 ID 기억
    const viewingId = state.currentId;

    const dataFromServer = await getInitialData();

    // [수정 2] 데이터를 받아왔더라도, 그 사이에 전송이 시작됐다면 덮어쓰기 금지 (핵심!)
    if (state.isSending) return;

    // [수정 핵심] 서버 DB 지연으로 인해, 현재 보고 있는 방(viewingId)이
    // dataFromServer.sessions 목록에 없을 수 있습니다.
    // 이 경우 로컬에 있는 세션 데이터를 보존해서 빈 화면이 되는 것을 막습니다.
    if (viewingId && state.sessions[viewingId]) {
      // 서버에서 온 데이터에 내 방이 없으면?
      if (!dataFromServer.sessions[viewingId]) {
        // 방금 만든 세션이라 서버에 아직 반영 안 된 것으로 간주하고 로컬 데이터 끼워넣기
        dataFromServer.sessions[viewingId] = state.sessions[viewingId];

        // 만약 recents(최근 목록)에도 없다면 끼워넣기 (선택 사항)
        const inRecents = dataFromServer.recents.find(
          (r) => r.id === viewingId
        );
        if (!inRecents) {
          dataFromServer.recents.unshift({
            id: viewingId,
            title: state.sessions[viewingId].title || "새 대화",
            updatedAt: Date.now(),
          });
        }
      }
    }

    // 2. 서버 데이터를 state에 병합
    Object.assign(state, dataFromServer);

    // 3. 화면 유지 vs 빈 화면 결정
    if (viewingId && state.sessions[viewingId]) {
      state.currentId = viewingId;
    } else {
      state.currentId = null;
    }
  } catch (err) {
    console.error("초기 데이터 로드 실패:", err);
  } finally {
    // [수정 3] 전송 중이 아닐 때만 렌더링 (선택 사항이나 안전을 위해)
    if (!state.isSending) {
      renderChat();
    }
  }
}

// Confirm Modal helpers
export const Modal = {
  el: null,
  msgEl: null,
  okBtn: null,
  cancelBtn: null,
  backdrop: null,
  lastFocus: null,
  init() {
    this.el = document.getElementById("confirmModal");
    if (!this.el) return;
    this.msgEl = document.getElementById("confirmDesc");
    this.okBtn = document.getElementById("confirmOk");
    this.cancelBtn = document.getElementById("confirmCancel");
    this.backdrop = this.el.querySelector(".modal-backdrop");
  },
  open({
    message = "⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다",
    okText = "삭제",
    cancelText = "취소",
    onConfirm,
  } = {}) {
    if (!this.el) return;
    this.lastFocus = document.activeElement;
    this.msgEl.textContent = message;
    this.okBtn.textContent = okText;
    this.cancelBtn.textContent = cancelText;
    const close = () => this.close();
    const confirm = () => {
      this.close();
      onConfirm && onConfirm();
    };
    this.okBtn.onclick = confirm;
    this.cancelBtn.onclick = close;
    this.backdrop.onclick = close;
    document.addEventListener(
      "keydown",
      (this._esc = (e) => {
        if (e.key === "Escape") close();
      }),
      { once: true }
    );
    this.el.classList.remove("hidden");
    this.okBtn.focus();
  },
  close() {
    if (!this.el) return;
    this.el.classList.add("hidden");
    this.okBtn.onclick = null;
    this.cancelBtn.onclick = null;
    this.backdrop.onclick = null;
    document.removeEventListener("keydown", this._esc);
    this.lastFocus && this.lastFocus.focus();
  },
};

// --- Toast ---
let toastTimer = null;
export function showToast(text, variant = "info", ms = 1800) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.className = `toast show ${variant}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "toast";
  }, ms);
}

// 닉네임 표시
export function updateNicknameDisplay() {
  const nick = (localStorage.getItem("todak_nickname") || "게스트").trim();
  const safeNick = nick || "게스트";

  // 1. 마이페이지 타이틀 닉네임 (ID: mypageUserNickname)
  const mypageEl = document.getElementById("mypageUserNickname");
  if (mypageEl) {
    mypageEl.textContent = safeNick;
  }

  // 2. 빈 채팅방 환영 닉네임 (Class: empty-hint-nickname)
  const emptyChatEl = document.querySelector(".empty-hint-nickname");
  if (emptyChatEl) {
    emptyChatEl.textContent = safeNick;
  }
}

export const FormModal = {
  el: null,
  titleEl: null,
  formEl: null,
  okBtn: null,
  cancelBtn: null,
  closeBtn: null,
  backdrop: null,
  lastFocus: null,
  onConfirmCallback: null,

  init() {
    this.el = document.getElementById("formModal");
    if (!this.el) return;
    this.titleEl = document.getElementById("formModalTitle");
    this.formEl = document.getElementById("formModalBody");
    this.okBtn = document.getElementById("formModalOk");
    this.cancelBtn = document.getElementById("formModalCancel");
    this.closeBtn = document.getElementById("formModalClose");
    this.backdrop = this.el.querySelector(".modal-backdrop");

    // 이벤트 리스너 바인딩
    this.okBtn.addEventListener("click", () => this.handleConfirm());
    this.cancelBtn.addEventListener("click", () => this.close());
    this.closeBtn.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("click", () => this.close());

    // Form 내부에서 Enter 키를 눌러도 폼이 제출(새로고침)되는 것을 방지
    this.formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleConfirm(); // Enter 키로도 확인 버튼 클릭 효과
    });
  },

  open({
    title,
    formHtml, // <input>, <label> 등이 포함된 HTML 문자열
    okText = "저장",
    onConfirm, // 확인 버튼 클릭 시 실행될 콜백
  } = {}) {
    if (!this.el) return;
    this.lastFocus = document.activeElement;
    this.titleEl.textContent = title;
    this.formEl.innerHTML = formHtml;
    this.okBtn.textContent = okText;
    this.onConfirmCallback = onConfirm; // 콜백 저장

    document.addEventListener(
      "keydown",
      (this._esc = (e) => {
        if (e.key === "Escape") this.close();
      }),
      { once: true }
    );
    this.el.classList.remove("hidden");

    // 폼의 첫 번째 입력창에 자동으로 포커스
    this.formEl.querySelector("input")?.focus();
  },

  handleConfirm() {
    if (!this.onConfirmCallback) {
      this.close();
      return;
    }

    // 1. 폼 데이터 객체로 변환
    const formData = new FormData(this.formEl);
    const data = Object.fromEntries(formData.entries());

    // 2. 콜백 실행
    // 콜백이 false를 반환하면 유효성 검사 실패로 간주하고 모달을 닫지 않음
    const result = this.onConfirmCallback(data);
    if (result !== false) {
      this.close();
    }
  },

  close() {
    if (!this.el) return;
    this.el.classList.add("hidden");
    this.formEl.innerHTML = ""; // 폼 내용 비우기
    this.onConfirmCallback = null;
    document.removeEventListener("keydown", this._esc);
    this.lastFocus && this.lastFocus.focus();
  },
};
