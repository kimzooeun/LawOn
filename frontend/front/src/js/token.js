export const TokenManager = (() => {
	const ACCESS_KEY = "accessToken";

	// in-memory copy (우선순위)
	let inMemoryAccess = null;
	
	const getAccessToken = () => {
		if (inMemoryAccess) return inMemoryAccess;
		// fallback: sessionStorage/localStorage (앱 시작 직후 복구용)
		return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY)
	};
		

	const setTokens = (accessToken, rememberMe) => {
		inMemoryAccess = accessToken;
		if(rememberMe){
			localStorage.setItem(ACCESS_KEY, accessToken);
		} else{
			sessionStorage.setItem(ACCESS_KEY, accessToken);
		}
	};
	
	const updateAccessToken = (newToken) => {
		inMemoryAccess = newToken;
		if (localStorage.getItem(ACCESS_KEY)) localStorage.setItem(ACCESS_KEY, newToken);
		else sessionStorage.setItem(ACCESS_KEY, newToken);
	};
	


	const clearTokens = () => {
		inMemoryAccess = null;
		localStorage.removeItem(ACCESS_KEY);
	  sessionStorage.removeItem(ACCESS_KEY);
		localStorage.removeItem(refreshToken);
		sessionStorage.removeItem(refreshToken);
	};
	

	document.addEventListener("DOMContentLoaded", () => {
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
  });

	document.getElementById("logoutBtn").addEventListener("click", async() =>{
		try{
			const token = TokenManager.getAccessToken();
			await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
		} catch(err){
			console.error("서버 로그아웃 실패 : ", err);
		} finally {
			// 무조건 클라이언트 토큰 제거 
			TokenManager.clearTokens();
			showToast("로그아웃 되었습니다.");
			setTimeout(() => window.location.href = "/", 800);
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

	return {getAccessToken, setTokens, updateAccessToken, clearTokens};
}) ();
