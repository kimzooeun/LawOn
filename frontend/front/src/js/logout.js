  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        // 로그인 정보 삭제
        localStorage.removeItem("userToken");
        localStorage.removeItem("userName");
        sessionStorage.clear();

        // 로그아웃 후 이동할 페이지
        alert("로그아웃 되었습니다.");
        window.location.href = "/";
      });
    }
  });


function showToast(message) {
  const toast = document.getElementById("auth-toast");
  toast.innerHTML = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1000);
}