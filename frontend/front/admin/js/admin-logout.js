// admin 로그아웃 스크립트

import { TokenManager } from '/src/js/token.js';

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      let apiFailed = false; // API 실패 여부 플래그
      try{
        // 1. API 호출 시도
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          apiFailed = true; // API가 200 OK가 아니어도 실패로 간주
        }
      } catch(err){
        apiFailed = true; // 네트워크 오류 등 API 호출 실패
        console.error("서버 로그아웃 API 호출 실패 : ", err);
      } finally {
          TokenManager.clearTokens();
          alert("관리자 로그아웃합니다!")
          setTimeout(() => (window.location.href = "/admin/login"), 600);
      }
    });
  }
});
