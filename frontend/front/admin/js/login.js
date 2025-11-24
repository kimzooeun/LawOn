// login.js
import { TokenManager } from '/src/js/token.js';


document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) {
    console.error("❌ loginForm 요소가 없습니다. 경로를 확인하세요.");
    return;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = document.getElementById("adminId")?.value || "";
    const password = document.getElementById("adminPw")?.value || "";

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname, password })
      });

      // HTML 반환되면 JSON 파싱 금지
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        alert("서버 인증 오류(HTML 응답). 개발 설정을 확인하세요.");
        return;
      }

      let resData = {};

      try{
        resData = await res.json();
      } catch(err){
      }
      
      if(res.ok){
        console.log(resData)
        TokenManager.setTokens(resData.accessToken, false);
        showToast("로그인 성공!");
        setTimeout(() => {
        window.location.href = "/admin/";
      }, 400);
      } else if (res.status === 400 && resData) {
        alert("로그인 실패. 아이디/비밀번호 확인");
        return;
      } else{
        alert("서버에서 알 수 없는 오류 발생");
        return;
      }
    } catch (err) {
      console.error("로그인 요청 실패:", err);
      alert("네트워크 오류!");
    }
  });
});

// 로그인 토스트 출력
function showToast(msg) {
  const toast = document.getElementById("login-toast");
  if (!toast) return;

  toast.innerText = msg;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 1000);
}
