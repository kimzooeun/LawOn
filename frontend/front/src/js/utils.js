// ===================================
// 1. 토닥토닥 [상태 & 유틸]
// (전역 변수, 스토리지, 모달, 토스트, 닉네임)
// ===================================

const STORE_KEY = "todak_chats_v1";
const STT_ENDPOINT = "http://127.0.0.1:8000/stt"; // 로컬 Whisper 서버
// const STT_ENDPOINT = "/stt";               // 배포용 엔드포인트
const AUTO_SEND_STT = true; // 채팅 화면 STT 결과 자동 전송

const qs = (s, r = document) => r.querySelector(s);
// 사이드바 접힘 상태 로컬스토리지 키
const SIDEBAR_COLLAPSED_KEY = "todak_sidebar_collapsed";

// 접힘/펼침 적용 함수
function applySidebarCollapsed(collapsed) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.classList.toggle("collapsed", !!collapsed);
}

// == 가짜 데이터 ==
// [추가] 비어있는 스토어
function createEmptyStore() {
  return { recents: [], sessions: {}, currentId: null };
}

// [추가] 더미 데이터 스토어 (최초 1회 로드용)
function createDummyStore() {
  const s1_id = "s_dummy_1";
  const s2_id = "s_dummy_2";
  const s3_id = "s_dummy_new"; // (새 채팅용)

  const dummyState = {
    recents: [
      // 최근 대화 목록
      {
        id: s2_id,
        title: "어제 나눴던 대화",
        updatedAt: Date.now() - 86400000,
      },
      { id: s1_id, title: "첫 번째 테스트", updatedAt: Date.now() - 172800000 },
    ],
    sessions: {
      // 실제 대화 내용
      [s1_id]: {
        id: s1_id,
        title: "첫 번째 테스트",
        createdAt: Date.now() - 172800000,
        messages: [
          { role: "user", text: "안녕, 잘 지내?", at: Date.now() - 172800000 },
          {
            role: "bot",
            text: "그럼요. 잘 지내고 있습니다.",
            at: Date.now() - 172800000,
          },
        ],
      },
      [s2_id]: {
        id: s2_id,
        title: "어제 나눴던 대화",
        createdAt: Date.now() - 86400000,
        messages: [
          { role: "user", text: "어제 뭐했어?", at: Date.now() - 86400000 },
          {
            role: "bot",
            text: "열심히 코딩 공부를 했습니다.",
            at: Date.now() - 86400000,
          },
        ],
      },
      [s3_id]: {
        id: s3_id,
        title: "새 대화",
        createdAt: Date.now(),
        messages: [], // 새 대화는 비어있음
      },
    },
    currentId: s3_id, // 현재 세션은 '새 대화'
  };
  return dummyState;
}

// ---- 스토리지 로드/저장 ----
// function loadStore(){
//   try{
//     return JSON.parse(localStorage.getItem(STORE_KEY)) || { recents:[], sessions:{}, currentId:null };
//   }catch{ return { recents:[], sessions:{}, currentId:null }; }
// }
// function saveStore(s){ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
// let state = loadStore();
function loadStore() {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) {
      // 데이터가 있으면 파싱해서 반환
      return JSON.parse(stored) || createEmptyStore();
    }
    // [수정] 저장된 데이터가 없으면, 더미 데이터 생성
    // (테스트 후 createEmptyStore()로 되돌리세요)
    showToast("✨ 테스트용 더미 데이터를 로드합니다.", "info", 2500);
    return createDummyStore();
  } catch {
    // 파싱 실패 시에도 더미 데이터
    return createDummyStore();
  }
}

function saveStore(s) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

let state = loadStore();

// [ADD] Confirm Modal helpers
const Modal = {
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
function showToast(text, variant = "info", ms = 1800) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.className = `toast show ${variant}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "toast";
  }, ms);
}
function showDeleteWarning() {
  showToast("⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다", "info", 2500);
}

// ✅ 닉네임 표시
function updateNicknameDisplay() {
  const el = document.getElementById("nicknameDisplay");
  if (!el) return;
  const nick = (localStorage.getItem("todak_nickname") || "").trim();
  el.textContent = nick || "게스트";
}
