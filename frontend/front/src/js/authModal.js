import { TokenManager } from "./token.js";

const authModal = document.getElementById("authModal");
const authOverlay = document.getElementById("auth-overlay");
const authCloseBtn = document.getElementById("authClose");
const portalRoot = document.getElementById("portal-root");
const chatWidget = document.getElementById("chat-widget");
const chatOverlay = document.getElementById("chat-overlay");
const USER_ID_KEY = "todak_user_id";
const NICK_KEY = "todak_nickname";

// 맞춤형 상담 버튼 클릭 시 열기
const customBtn = document.getElementById("btnCustom");
if (customBtn) {
  customBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const accessToken = TokenManager.getAccessToken();
    if (accessToken) {
      document.body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = "/chat.html";
      }, 500);
      return;
    }
    // 비로그인 상태
    openAuthModal();
  });
}

// 모달 열기
export function openAuthModal() {
  // 포털로 이동
  if (portalRoot && authOverlay && authModal) {
    portalRoot.appendChild(authOverlay);
    portalRoot.appendChild(authModal);
  }

  portalRoot.style.pointerEvents = "auto";
  authModal.style.pointerEvents = "auto";

  chatWidget?.classList.remove("is-open");
  chatOverlay?.classList.remove("is-open");
  chatOverlay?.style.setProperty("pointer-events", "none");

  authModal.classList.add("is-open");
  authOverlay.classList.add("is-open");
  document.body.style.overflow = "hidden"; // 스크롤 방지
}

// 모달 닫기
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

// 닫기 버튼
if (authCloseBtn) {
  authCloseBtn.addEventListener("click", closeAuthModal);
}

// ESC 키로 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && authModal.classList.contains("is-open")) {
    closeAuthModal();
  }
});

// 오버레이 클릭 시 닫기
portalRoot?.addEventListener("click", (e) => {
  if (e.target === authOverlay && authModal.classList.contains("is-open")) {
    closeAuthModal();
  }
});

// 탭 전환 (이벤트 위임 사용 → appendChild 영향 안받음)
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
});

//-----------------------------------------------------------------------------
// 로그인 폼 제출
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const nickname = document.getElementById("loginNickname").value;
    const password = document.getElementById("loginPassword").value;

    const errorDiv = document.getElementById("login-error-message");

    if (!nickname || !password) {
      if (errorDiv) {
        errorDiv.innerText = "아이디와 비밀번호를 모두 입력해주세요.";
        errorDiv.classList.add("show");
      }
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname, password }),
      });

      // 3) 응답 파싱 (JSON이 아닐 수도 있으니까 방어적으로)
      let resData = {};
      try {
        resData = await response.json();
      } catch (parseErr) {
        console.warn("로그인 응답 JSON 파싱 실패:", parseErr);
      }

      if (response.ok) {
        // accessToken 저장
        if (resData.accessToken) {
          TokenManager.setTokens(resData.accessToken, false);
        } else {
          console.warn("accessToken이 응답에 없습니다:", resData);
        }

        if (resData.userId && resData.display_name) {
          localStorage.setItem(USER_ID_KEY, resData.userId);
          localStorage.setItem(NICK_KEY, resData.display_name);
        } else {
          console.warn(
            "로그인 응답 데이터에 userId 또는 display_name이 없습니다.",
            resData
          );
        }

        TokenManager.showToast_auth("로그인 완료!<br>맞춤형 상담 페이지로 이동");
        resetAuthForms();

        setTimeout(() => {
          window.location.href = "/chat";
        }, 800);

        return;
      }

      if (response.status === 400 && resData) {
        if (errorDiv) {
          errorDiv.innerText =
            resData.message || "아이디 또는 비밀번호를 다시 확인해주세요.";
          errorDiv.classList.add("show");
        }
        return;
      }

      if (errorDiv) {
        errorDiv.innerText =
          resData.message || "서버에서 알 수 없는 오류가 발생했습니다.";
        errorDiv.classList.add("show");
      }
    } catch (err) {
      console.error("로그인 처리 중 JS/네트워크 에러:", err);

      if (errorDiv) {
        errorDiv.innerText = "네트워크 연결 또는 기타 치명적인 오류 발생!";
        errorDiv.classList.add("show");
      }
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
        TokenManager.showToast_auth("회원가입이 완료되었습니다!<br>    로그인해주세요!");
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

// function showToast(message) {
//   const toast = document.getElementById("auth-toast");
//   toast.innerHTML = message;
//   toast.classList.add("show");

//   setTimeout(() => {
//     toast.classList.remove("show");
//   }, 1000);
// }

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
    });
  }

  // 로그인 탭으로 전환할 때 폼 리셋
  window.switchToLoginTab = function () {
    document.getElementById("tab-login")?.classList.add("active");
    document.getElementById("tab-signup")?.classList.remove("active");
    document.getElementById("loginTab")?.classList.add("active");
    document.getElementById("signupTab")?.classList.remove("active");

    resetAuthForms();
  };
});

function resetAuthForms() {
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
