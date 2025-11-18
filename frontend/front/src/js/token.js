export const TokenManager = (() => {

  const ACCESS_KEY = "accessToken";

  const getAccessToken = () => {
    return (
      localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY)
    );
  };

  const setTokens = (accessToken, rememberMe) => {
    if (rememberMe) {
      localStorage.setItem(ACCESS_KEY, accessToken);
    } else {
      sessionStorage.setItem(ACCESS_KEY, accessToken);
    }
  };

  const updateAccessToken = (newToken) => {
    if (localStorage.getItem(ACCESS_KEY))
      localStorage.setItem(ACCESS_KEY, newToken);
    else sessionStorage.setItem(ACCESS_KEY, newToken);
  };

  const clearTokens = () => {
    localStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
  };

  document.addEventListener("DOMContentLoaded", () => {
    updateButtonVisibility(); // 페이지 로드 시 버튼 상태 초기화

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        let apiFailed = false; // API 실패 여부 플래그
        try {
          // 1. API 호출 시도
          const response = await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
          });
          if (!response.ok) {
            apiFailed = true; // API가 200 OK가 아니어도 실패로 간주
          }
        } catch (err) {
          apiFailed = true; // 네트워크 오류 등 API 호출 실패
          console.error("서버 로그아웃 API 호출 실패 : ", err);
        } finally {
          // 2. API 성공/실패와 관계없이 *항상* 모든 로컬 데이터 삭제

          // 2-1. TokenManager로 토큰 삭제 (이 파일 내에 있으므로 사용 가능)
          TokenManager.clearTokens();

          // 2-2. 다른 모든 관련 데이터 직접 삭제 (init.js와 동일하게)
          localStorage.removeItem("todak_chats_v1");
          localStorage.removeItem("todak_sidebar_collapsed");
          localStorage.removeItem("todak_nickname");
          localStorage.removeItem("todak_user_id");
          localStorage.removeItem("hard_theme");

          // 2-3. mypage.js에서 사용하는 키 삭제
          localStorage.removeItem("todak_recents"); //
          localStorage.removeItem("todak_push_enabled"); //

          // 3. 피드백 및 리디렉션
          const toastMsg = apiFailed
            ? "로그아웃. 로컬 데이터만 삭제합니다."
            : "로그아웃 되었습니다.";
          showToast(toastMsg); // token.js의 showToast 사용

          setTimeout(() => (window.location.href = "/"), 600);
        }
      });
    }
  });

  // 로그인/로그아웃 되면 버튼 change 되는 로직 구현
  function updateButtonVisibility() {
    const accessToken = TokenManager.getAccessToken();
    const simpleChatBtn = document.getElementById("simpleChatBtn");
    const customChatBtn = document.getElementById("btnCustom");
    const logoutBtn = document.getElementById("logoutBtn");

    if (accessToken) {
      // 로그인된 상태
      if (simpleChatBtn) simpleChatBtn.style.display = "none";
      if (customChatBtn) customChatBtn.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
      // 비로그인 상태
      if (simpleChatBtn) simpleChatBtn.style.display = "inline-block";
      if (customChatBtn) customChatBtn.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  }

  function showToast_auth(message) {
    const toast = document.getElementById("auth-toast");
    toast.innerHTML = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 1000);
  }
  return { getAccessToken, setTokens, updateAccessToken, clearTokens, showToast_auth};
})();

