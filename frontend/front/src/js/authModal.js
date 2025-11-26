import { TokenManager } from "./token.js";

const closeChatBtn = document.getElementById("close-chat-btn");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatBody = document.getElementById("chat-body");
const loadingMessage = document.getElementById("chat-loading-message");
const chatLoginBanner = document.getElementById("chat-login-banner");
const chatGoSignup = document.getElementById("chat-go-signup");

const authModal = document.getElementById("authModal");
const authOverlay = document.getElementById("auth-overlay");
const authCloseBtn = document.getElementById("authClose");
const portalRoot = document.getElementById("portal-root");
const chatWidget = document.getElementById("chat-widget");
const chatOverlay = document.getElementById("chat-overlay");
const USER_ID_KEY = "todak_user_id";
const NICK_KEY = "todak_nickname";

// 세션 관리용 변수
const SIMPLE_SESSION_KEY = "simpleChatSessionId";
let simpleSessionId = localStorage.getItem(SIMPLE_SESSION_KEY) || null;
let inputDisabled = false; // 입력 폼 막는 용
let historyLoaded = false; // 히스토리 로딩 여부

// 맞춤형 상담 버튼 클릭 시 열기
const customBtn = document.getElementById("btnCustom");
if (customBtn) {
  customBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const accessToken = TokenManager.getAccessToken();
    if (accessToken) {
      document.body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = "/chat";
      }, 500);
      return;
    }
    // 비로그인 상태
    openAuthModal();
  });
}

// 맞춤형 상담 모달 열기
export function openAuthModal() {
  portalRoot.style.pointerEvents = "auto";
  authModal.style.pointerEvents = "auto";

  chatWidget?.classList.remove("is-open");
  chatOverlay?.classList.remove("is-open");
  chatOverlay?.style.setProperty("pointer-events", "none");

  authModal.classList.add("is-open");
  authOverlay.classList.add("is-open");
  document.body.style.overflow = "hidden"; // 스크롤 방지

  // 만약 기본 탭이 signupTab 이라면
  const signupTabVisible = document
    .getElementById("signupTab")
    ?.classList.contains("active");
  if (signupTabVisible) {
    bindSignupPasswordEvents();
  }

  const loginTabVisible = document
    .getElementById("loginTab")
    ?.classList.contains("active");
  if (loginTabVisible) {
    bindLoginEvents();
  }
}

// 맞춤형 상담 모달 닫기
function closeAuthModal() {
  authModal.classList.remove("is-open");
  authOverlay.classList.remove("is-open");

  document.body.style.overflow = ""; // 스크롤 복원
  chatOverlay?.style.removeProperty("pointer-events");
  portalRoot.style.pointerEvents = "none";
  resetAuthForms();
  // transition 끝난 후 overflow 복원
  authModal.addEventListener(
    "transitionend",
    () => {
      document.body.style.overflow = "";
    },
    { once: true }
  );
}

// 맞춤형 상담 모달 닫기 버튼
if (authCloseBtn) {
  authCloseBtn.addEventListener("click", closeAuthModal);
}

// 맞춤형 상담 ESC 키로 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && authModal.classList.contains("is-open")) {
    closeAuthModal();
  }
});

// 맞춤형 상담 관련 오버레이 클릭 시 닫기
portalRoot?.addEventListener("click", (e) => {
  if (e.target === authOverlay && authModal.classList.contains("is-open")) {
    closeAuthModal();
  }
});

// 맞춤형 상담 탭 전환 (이벤트 위임 사용 → appendChild 영향 안받음)
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".auth-tab");
  if (!tab) return; // 다른 곳 클릭시 무시

  const targetTab = tab.dataset.tab; // "login" or "signup"
  if (!targetTab) return;

  // 모든 탭/콘텐츠 초기화
  document
    .querySelectorAll(".auth-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".auth-content")
    .forEach((c) => c.classList.remove("active"));

  // 클릭한 탭 활성화
  tab.classList.add("active");

  // 대응되는 콘텐츠 활성화
  const content = document.getElementById(`${targetTab}Tab`);
  if (content) {
    content.classList.add("active");
  } else {
    console.warn(`탭 콘텐츠를 찾을 수 없음: #${targetTab}Tab`);
  }

  if (targetTab === "signup") {
    bindSignupPasswordEvents(); // 이벤트 바인딩은 reset 이후에 실행해야함
  }

  if (targetTab === "login") {
    bindLoginEvents(); // 이벤트 바인딩은 reset 이후에 실행해야함
  }
});

function updateInputLogin() {
  const nickname = document.getElementById("loginNickname").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const loginSubmitBtn = document.querySelector("#loginForm .auth-submit-btn");

  loginSubmitBtn.disabled = !(nickname && password);
}

function bindLoginEvents() {
  const nicknameInput = document.getElementById("loginNickname");
  const pwInput = document.getElementById("loginPassword");
  const loginSubmitBtn = document.querySelector("#loginForm .auth-submit-btn");

  if (!nicknameInput || !pwInput || !loginSubmitBtn) return;

  nicknameInput.oninput = updateInputLogin;
  pwInput.oninput = updateInputLogin;

  updateInputLogin();
}

//-----------------------------------------------------------------------------
// 로그인 폼 제출
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const nickname = document.getElementById("loginNickname").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 쿠키 전송 허용
        body: JSON.stringify({ nickname, password }),
      });

      let resData = {};
      try {
        resData = await response.json(); // 위 JSON을 받음
      } catch (err) {}

      if (response.ok) {
        //200 OK 성공 처리 JWT 저장
        TokenManager.setTokens(resData.accessToken, false);

        if (resData.userId && resData.display_name) {
          localStorage.setItem(USER_ID_KEY, resData.userId);
          localStorage.setItem(NICK_KEY, resData.display_name);
          console.log("로그인 성공: ", resData.display_name);
          console.log("userId:", resData.userId);
        } else {
          // 백엔드 응답에 userId나 display_name이 없는 경우 경고
          console.warn(
            "로그인 응답 데이터에 userId 또는 display_name이 없습니다.",
            resData
          );
        }

        TokenManager.showToast_auth(
          "로그인 완료!<br>맞춤형 상담 페이지로 이동"
        );
        resetAuthForms();

        setTimeout(() => {
          window.location.href = "/chat";
        }, 800);
      } else if (response.status === 400 && resData) {
        // 400 Bad Request (유효성 검사 실패) 처리
        const div = document.getElementById("login-error-message");
        if (div) div.innerText = resData.message;
        div.classList.add("show");
      } else {
        // 500 Internal Server Error 또는 기타 서버 오류 처리
        const errorDiv = document.getElementById("login-error-message");
        errorDiv.innerText =
          resData.message || "서버에서 알 수 없는 오류가 발생했습니다.";
        errorDiv.classList.add("show");
      }
    } catch (err) {
      // 네트워크 오류, JSON 파싱 실패 등 예상치 못한 오류 처리
      const errorDiv = document.getElementById("login-error-message");
      errorDiv.innerText = "네트워크 연결 또는 기타 치명적인 오류 발생!";
      errorDiv.classList.add("show");
    }
  });

//-----------------------------------------------------------------------------
// 회원가입 폼 제출
document
  .getElementById("signupForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const nickname = document.getElementById("nickname").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // 오류 초기화
    ["nickname", "password", "confirmPassword"].forEach((id) => {
      const el = document.getElementById(`error-${id}`);
      if (el) {
        el.innerText = "";
        el.classList.remove("show");
      }
    });

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname,
          password: password,
          confirmPassword: confirmPassword,
        }),
      });

      let resData = {};
      try {
        resData = await response.json();
      } catch (err) {}

      if (response.ok) {
        //200 OK 성공 처리
        TokenManager.showToast_auth(
          "회원가입이 완료되었습니다!<br>    로그인해주세요!"
        );
        switchToLoginTab();
        setTimeout(() => {
          document.getElementById("loginNickname").focus();
        }, 300);
      } else if (response.status === 400 && resData && resData.errors) {
        // 400 Bad Request (유효성 검사 실패) 처리
        if (resData.errors) {
          for (const [key, msg] of Object.entries(resData.errors)) {
            const div = document.getElementById(`error-${key}`);
            if (div) div.innerText = msg;
            div.classList.add("show");
          }
        } else {
          // 400 응답이지만, errors 필드가 없을 경우를 대비(일반적인 400 오류)
          const errorDiv = document.getElementById("signup-error-message");
          errorDiv.innerText =
            resData.message || "유효성 검사 실패. 다시 확인해주세요.";
          errorDiv.classList.add("show");
        }
      } else {
        // 500 Internal Server Error 또는 기타 서버 오류 처리
        const errorDiv = document.getElementById("signup-error-message");
        errorDiv.innerText =
          resData.message || "서버에서 알 수 없는 오류가 발생했습니다.";
        errorDiv.classList.add("show");
      }
    } catch (err) {
      // 네트워크 오류, JSON 파싱 실패 등 예상치 못한 오류 처리
      const errorDiv = document.getElementById("signup-error-message");
      errorDiv.innerText = "네트워크 연결 또는 기타 치명적인 오류 발생!";
      errorDiv.classList.add("show");
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  // 회원가입 탭 클릭 시 폼 리셋
  const tabSignup = document.getElementById("tab-signup");
  if (tabSignup) {
    tabSignup.addEventListener("click", () => {
      const signupForm = document.getElementById("signupForm");
      if (signupForm) signupForm.reset();

      ["nickname", "password", "confirmPassword"].forEach((id) => {
        const el = document.getElementById(`error-${id}`);
        if (el) el.innerText = "";
      });
      resetAuthForms();
    });
  }

  // 로그인 탭 클릭 시 폼 리셋
  const tabLogin = document.getElementById("tab-login");
  if (tabLogin) {
    tabLogin.addEventListener("click", () => {
      const loginForm = document.getElementById("loginForm");
      if (loginForm) loginForm.reset();
      ["nickname", "password", "confirmPassword"].forEach((id) => {
        const el = document.getElementById(`error-${id}`);
        if (el) el.innerText = "";
      });
      resetAuthForms();
    });
  }

  // 로그인 탭으로 전환할 때 폼 리셋
  window.switchToLoginTab = function () {
    document.getElementById("tab-login")?.classList.add("active");
    document.getElementById("tab-signup")?.classList.remove("active");
    document.getElementById("loginTab")?.classList.add("active");
    document.getElementById("signupTab")?.classList.remove("active");
  };
});

function updatePasswordMatchUI() {
  const nickname = document.getElementById("nickname").value.trim();
  const pwInput = document.querySelector("#signupTab #password");
  const pwCheckInput = document.querySelector("#signupTab #confirmPassword");
  const pwCheckError = document.querySelector(
    "#signupTab #error-confirmPassword"
  );
  const signupSubmitBtn = document.querySelector(
    "#signupForm .auth-submit-btn"
  );

  const pw = pwInput.value;
  const pw2 = pwCheckInput.value;

  pwInput.classList.remove("is-valid", "is-invalid");
  pwCheckInput.classList.remove("is-valid", "is-invalid");
  pwCheckError.classList.remove("text-success", "text-danger");
  pwCheckError.innerText = "";

  if (!pw && !pw2) {
    // 아무것도 안들어오면 UI도 안 띄움
  } else if (pw !== pw2) {
    pwInput.classList.add("is-invalid");
    pwCheckInput.classList.add("is-invalid");
    pwCheckError.classList.add("text-danger");
    pwCheckError.innerText = "비밀번호가 일치하지 않습니다.";
    signupSubmitBtn.disabled = true; // 불일치면 무조건 비활성화
    return;
  } else if (pw === pw2) {
    pwInput.classList.add("is-valid");
    pwCheckInput.classList.add("is-valid");
    pwCheckError.classList.add("text-success");
    pwCheckError.innerText = "비밀번호가 일치합니다.";
  }

  // 버튼 활성화는 nickname까지 포함
  const allFilled = nickname && pw && pw2;
  const pwMatch = pw === pw2;

  signupSubmitBtn.disabled = !(allFilled && pwMatch);
}

function updatePasswordStrengthUI() {
  const pwInput = document.querySelector("#signupTab #password");
  const strengthBox = document.querySelector("#signupTab #password-strength");
  const strengthBar = document.querySelector(
    "#signupTab #password-strength-bar"
  );
  const strengthText = document.querySelector(
    "#signupTab #password-strength-text"
  );

  if (!pwInput || !strengthBox || !strengthBar || !strengthText) return;

  const pw = pwInput.value;
  const info = passwordStrength(pw);

  strengthBox.setAttribute("data-level", info.level || "empty");

  if (!pw) {
    strengthBar.style.width = "0%";
    strengthText.textContent = "";
    return;
  }

  strengthBar.style.width = info.width + "%";
  strengthText.textContent = `비밀번호 강도: ${info.label}`;
}

// 비밀번호 강도 설정 UI
function passwordStrength(pw) {
  const strengthBox = document.getElementById("password-strength");
  const strengthBar = document.getElementById("password-strength-bar");
  const strengthText = document.getElementById("password-strength-text");

  const COMMON_PATTERNS = ["1234", "123456", "abcd", "qwerty", "password"];

  // 아무것도 안썻을때, 강도 UI 통째로 숨김
  if (!pw || pw.length === 0) {
    strengthBox.classList.remove("show");
    strengthBox.dataset.level = "empty";
    strengthBar.style.width = "0%";
    strengthText.textContent = "비밀번호를 입력해주세요";
    return { level: "empty", width: 0, label: "" };
  }

  // 한글자라도 쓰기 시작하면 보임
  strengthBox.classList.add("show");
  let score = 0;

  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;

  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);

  let kinds = 0;
  if (hasUpper) kinds++;
  if (hasLower) kinds++;
  if (hasDigit) kinds++;
  if (hasSpecial) kinds++;

  const lowerPw = pw.toLowerCase();
  let hasCommon = COMMON_PATTERNS.some((p) => lowerPw.includes(p));
  const repeated = /(.)\1{3,}/.test(pw); // 같은 문자 4번 이상 연속

  if (hasCommon || repeated) {
    return { level: "weak", score: 0, label: "약함", width: 25 };
  }

  if (pw.length >= 10 && kinds >= 3) {
    return { level: "strong", label: "강함", width: 100 };
  }
  if (pw.length >= 8 && kinds >= 2) {
    return { level: "medium", label: "보통", width: 60 };
  }
  return { level: "weak", label: "약함", width: 25 };
}

function bindSignupPasswordEvents() {
  console.log("bindSignupPasswordEvents 호출됨");
  const nicknameInput = document.getElementById("nickname");
  const pwInput = document.querySelector("#signupTab #password");
  const pwCheckInput = document.querySelector("#signupTab #confirmPassword");

  if (!nicknameInput || !pwInput || !pwCheckInput) return;

  nicknameInput.oninput = () => {
    updatePasswordMatchUI();
  };

  pwInput.oninput = () => {
    updatePasswordMatchUI();
    updatePasswordStrengthUI();
  };

  pwCheckInput.oninput = () => {
    updatePasswordMatchUI();
  };

  // 초기 상태
  updatePasswordMatchUI();
  updatePasswordStrengthUI();
}

function resetAuthForms() {
  console.log("resetAuthForms 호출됨");
  // 모든 폼 리셋
  document.getElementById("loginForm")?.reset();
  document.getElementById("signupForm")?.reset();

  // 모든 에러 텍스트와 show 클래스 제거
  ["nickname", "password", "confirmPassword"].forEach((id) => {
    const el = document.getElementById(`error-${id}`);
    if (el) {
      el.innerText = "";
      el.classList.remove("show");
    }
  });

  const alertEls = document.querySelectorAll(".alert-danger");
  alertEls.forEach((el) => {
    el.innerText = "";
    el.classList.remove("show");
  });
}

// 간편 상담에서 5번 이후, 회원가입 하러가기 눌렀을 때 쓸 함수
function openSignupModal() {
  // 기존 모달 열기 로직 재사용
  openAuthModal();

  // 탭을 회원가입으로 강제 세팅
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");

  tabLogin?.classList.remove("active");
  tabSignup?.classList.add("active");
  loginTab?.classList.remove("active");
  signupTab?.classList.add("active");

  resetAuthForms();
}

// 간편 상담 버튼 클릭 시 열기
const quickBtn = document.querySelector('[data-role="quick"]');
if (quickBtn) {
  quickBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openChat();
  });
}

// 무료로 시작하기 버튼 클릭시 열기
const quick = document.getElementById("quick");
if (quick) {
  quick.addEventListener("click", (e) => {
    e.preventDefault();
    openChat();
  });
}

// 간편 상담 채팅 열기
function openChat() {
  chatWidget.classList.add("is-open");
  chatOverlay.classList.add("is-open");
  document.body.classList.add("chat-open");
  chatInput.focus();

   // 혹시 남아있다면 초기화
  if (!historyLoaded) {
    chatBody.innerHTML = "";
  }

  loadSimpleChatHistory(); // 히스토리 복원
}

// 간편 상담 채팅 닫기
function closeChat() {
  chatWidget.classList.remove("is-open");
  chatOverlay.classList.remove("is-open");
  document.body.classList.remove("chat-open");

  // DOM 비우기 
  chatBody.innerHTML="";

  // 다음 오픈 시 히스토리 다시 불러오도록 
  historyLoaded = false;

  inputDisabled = false;
  chatInput.disabled = false;
  chatSendBtn.disabled = false;
}

if (closeChatBtn) {
  closeChatBtn.addEventListener("click", closeChat);
}

// 간편 상담 관련 오버레이 클릭 시 닫기
if (chatOverlay) {
  chatOverlay.addEventListener("click", closeChat);
}

// 간편 상담 ESC 키로 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && chatWidget.classList.contains("is-open")) {
    closeChat();
  }
});

// 간편 상담 메시지 전송
async function sendMessage() {
  if (inputDisabled) return; // 제한 걸렸으면 전송 막음

  const message = chatInput.value.trim();
  if (!message) return;

  // 유저 메시지 추가
  addMessage(message, "user");
  chatInput.value = "";

  // 로딩 표시
  showLoading();

  try {
    const body = { query: message };
    if (simpleSessionId) {
      body.session_id = simpleSessionId;
    }

    const response = await fetch("/fastapi/simple-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log(data);

    // 세션 ID가 없던 상태였는데, 이번에 새로 발급됐다면 저장
    if (!simpleSessionId && data.session_id) {
      simpleSessionId = data.session_id;
      localStorage.setItem(SIMPLE_SESSION_KEY, simpleSessionId);
    }

    hideLoading();

    // 봇 메시지 추가
    addMessage(data.answer, "bot");

    // 상태(질문 카운트, 제한 여부, 배너 등) 업데이트
    updateChatState(data);
  } catch (err) {
    console.error(err);
    hideLoading();
    addMessage(
      "서버와 통신 중 오류가 발생했어요. 잠시 후 다시 시도해주세요 🙏",
      "bot"
    );
  }
}

// 간편 상담 모달 열면 히스토리 복원 요청 함수
async function loadSimpleChatHistory() {
  if (!simpleSessionId) return; // 세션 없으면 return
  if (historyLoaded) return; // 이미 한번 true 되면 즉, 한 번 불렀으면 또 안함
  historyLoaded = true;

  try {
    const response = await fetch(
      `/fastapi/simple-chat/history?session_id=${encodeURIComponent(simpleSessionId)}`
    );

    if (!response.ok) {
      console.warn("간편 상담 히스토리 fetch 실패", response.status);
      return;
    }

    const data = await response.json();

    // 세션 만료된 경우 (Redis TTL 지나서 없어진 경우)
    if (data.session_expired) {
      localStorage.removeItem(SIMPLE_SESSION_KEY);
      simpleSessionId = null;

      // 채팅창 비우고, 안내 메시지 띄움
      if (chatBody) {
        chatBody.innerHTML = "";
        addMessage(
          "이전에 진행하셨던 간편 상담 기록은 만료되어 새로 시작됩니다.\n새로운 질문을 남겨주시면 도와드릴게요! 무엇이 궁금하신가요? 😊",
          "bot"
        );
        chatBody.scrollTop = chatBody.scrollHeight;

        inputDisabled = false; // 입력 가능 상태로 초기화
        if (chatInput) chatInput.disabled = false;
        if (chatSendBtn) chatSendBtn.disabled = false;
        return;
      }
    }

    const history = data.history || [];

    history.forEach((item) => {
      if (item.user) {
        addMessage(item.user, "user");
      }
      if (item.bot) {
        addMessage(item.bot, "bot");
      }
    });

    updateChatState(data);
  } catch (err) {
    console.err("히스토리 로딩 중 에러", err);
  }
}

// 간편 상담 상태 업데이트 함수
function updateChatState(data) {
  // limit_reached면 입력 막음 (5번째 질문 이후)
  if (data.limit_reached) {
    inputDisabled = true;
    if (chatInput) chatInput.disabled = true;
    if (chatSendBtn) chatSendBtn.disabled = true;
  }

  // 회원가입 유도
  if (chatLoginBanner) {
    chatLoginBanner.style.display = data.limit_reached ? "block" : "none";
  }
}

if (chatGoSignup) {
  chatGoSignup.addEventListener("click", () => {
    openSignupModal();
  });
}

// 간편 상담 메시지 추가 함수
function addMessage(text, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${type}`;
  messageDiv.textContent = text;
  chatBody.appendChild(messageDiv);

  // 스크롤 맨 아래로
  chatBody.scrollTop = chatBody.scrollHeight;
}

// 간편 상담 로딩 표시/숨김
function showLoading() {
  if (!loadingMessage || !chatBody) return;

  loadingMessage.style.display = "block";
  chatBody.appendChild(loadingMessage); // 항상 맨 아래에 오도록
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideLoading() {
  if (!loadingMessage) return;
  loadingMessage.style.display = "none";
}

// 간편 상담 전송 버튼 클릭
if (chatSendBtn) {
  chatSendBtn.addEventListener("click", sendMessage);
}

// 간편 상담 Enter 키로 전송
if (chatInput) {
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}
