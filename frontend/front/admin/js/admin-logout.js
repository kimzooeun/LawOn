// admin 로그아웃 스크립트
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {

      // 토큰 삭제 (admin 인증은 accessToken으로 관리됨)
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");

      // 혹시 남아 있을 세션 초기화
      sessionStorage.clear();

      // 로그아웃 안내
      alert("관리자 로그아웃 되었습니다.");

      // 관리자 로그인 페이지로 이동
      window.location.href = "/admin/login";
    });
  }
});
