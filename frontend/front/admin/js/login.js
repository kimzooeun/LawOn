const API_BASE_URL = "http://localhost:8080/api/admin";


document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("adminId").value;
  const pw = document.getElementById("adminPw").value;

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({	
		username: document.getElementById("adminId").value,
	    password: document.getElementById("adminPw").value
	}),
  });
  if (res.ok) {
    // 테스트용 세션 저장 (JWT 비활성 상태)
    localStorage.setItem("adminLogin", "true");
    // ✅ 성공 시 페이지 이동
    window.location.href = "/admin/main.html";
  } else {
    alert("로그인 실패. 아이디 또는 비밀번호를 확인하세요.");
  }
});
