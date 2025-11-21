// 1. 상태 & 유틸
// (전역 변수, 스토리지, 모달, 토스트, 닉네임)

import { getInitialData } from "./api.js";
import { renderChat } from "./chat.js";

export const STORE_KEY = "todak_chats_v1";
export const STT_ENDPOINT = `${import.meta.env.VITE_FASTAPI_URL}/stt`;
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
  return { recents: [], sessions: {}, currentId: null };
}

// ---- 스토리지 로드/저장 ----
export let state = createEmptyStore(); // 일단 빈 상태로 시작

export async function loadInitialData() {
  try {
    const dataFromServer = await getInitialData(); // 1. API 호출

    console.log("[Debug] 서버로부터 받은 초기 데이터:", dataFromServer);

    Object.assign(state, dataFromServer); // 2. 전역 state에 덮어쓰기
  } catch (err) {
    console.error("초기 데이터 로드 실패:", err);
    showToast("데이터 로드에 실패했습니다.", "error");
    // 실패 시 로컬스토리지 (선택적)
    // const localData = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    // if (localData) Object.assign(state, localData);
  } finally {
    // 3. 데이터 로드가 완료된 후 채팅방 렌더링
    if (!state.currentId && state.recents.length > 0) {
      state.currentId = state.recents[0].id;
    }
    renderChat(); // init.js에서 호출하던 것을 여기로 이동
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
