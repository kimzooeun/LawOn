export const TokenManager = (() => {
	const ACCESS_KEY = "accessToken";
	
	const getAccessToken = () => {
		return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY)
	};
		

	const setTokens = (accessToken, rememberMe) => {
		if(rememberMe){
			localStorage.setItem(ACCESS_KEY, accessToken);
		} else{
			sessionStorage.setItem(ACCESS_KEY, accessToken);
		}
	};
	
	const updateAccessToken = (newToken) => {
		if (localStorage.getItem(ACCESS_KEY)) localStorage.setItem(ACCESS_KEY, newToken);
		else sessionStorage.setItem(ACCESS_KEY, newToken);
	};
	


	const clearTokens = () => {
		localStorage.removeItem(ACCESS_KEY);
	  sessionStorage.removeItem(ACCESS_KEY);
	};
	


	document.addEventListener("DOMContentLoaded", () => {
		updateButtonVisibility();    // 페이지 로드 시 버튼 상태 초기화 
		
		const logoutBtn = document.getElementById("logoutBtn");
		if(logoutBtn){
			logoutBtn.addEventListener("click", async() =>{
				try{
					const response = await fetch('/api/logout', {
						method: 'POST',
						credentials: "include",
    				});
					
					if(response.ok){
						TokenManager.clearTokens();
						showToast("로그아웃 되었습니다.");
						setTimeout(() => window.location.href = "/", 600);
					}else{
						const message = await response.text();
						alert("로그아웃 실패:"+message);
					}
				}catch(err){
					console.error("서버 로그아웃 실패 : ", err);
					alert("네트워크 오류 발생!");
				}
			});
		}
  });

	// 로그인/로그아웃 되면 버튼 change 되는 로직 구현 
	function updateButtonVisibility(){
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
