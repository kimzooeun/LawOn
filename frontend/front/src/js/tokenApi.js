import {TokenManager} from './token.js';

// 모든 API 요청 공통 함수
// API 호출(fetch 등)을 하기 전에, 자동으로 토큰과 쿠키를 포함하도록 세팅하는 유틸 함수
// 즉, 모든 API 요청에 공통으로 들어갈 옵션을 한 곳에서 관리하는 역할 
const originalFetch = window.fetch;

// 로그인/회원가입/리프레시 요청은 Authorization 헤더 제외
const skipAuth = ['/api/login', '/api/signup', '/api/refresh'];

const skipContentType = ["/stt"];
window.fetch = async(url, options = {}) => {
	const isSkipAuth = skipAuth.some((path) => url.includes(path));
	const isSkipContent = skipContentType.some((path) => url.includes(path));

	let accessToken = TokenManager.getAccessToken();
	options = { ...options };  // 기존 options 객체를 복사해서 새 객체를 만드는 부분
	options.headers = options.headers ? { ...options.headers } : {};    // 안전하게 헤더를 추가할 수 있도록 하는 준비 코드

	//  STT 요청일 경우 Content-Type 자동 추가 금지!
	// body가 존재하고, Content-Type이 명시되지 않았다면 자동으로 JSON 지정
	 if (!isSkipContent) {
        if (options.body && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }
    }

	// 실제로 Authorization 헤더에 JWT 토큰을 붙임 (단, skipAuth 제외)
	// 로그인 후 API 요청 시 인증을 위해 꼭 필요한 부분
	if(accessToken && !isSkipAuth)  options.headers['Authorization'] = `Bearer ${accessToken}`;	
	options.credentials = "include";  // refreshToken 쿠키 자동 전송

	let res = await originalFetch(url, options);



	// 백엔드에서 새 AccessToken이 헤더에 왔는지 확인 
	const newAuthHeader = res.headers.get("Authorization");
	if(newAuthHeader){
		const newAccessToken = newAuthHeader.replace("Bearer ", "");
		TokenManager.updateAccessToken(newAccessToken);
		console.log("🔄 서버에서 새 AccessToken 재발급 감지:", newAccessToken);
	}

	// 혹시라도 401이 왔다면
	if (res.status === 401 || res.status === 403){
		console.log("🔁 AccessToken 만료 → /api/refresh 직접 호출");
		
		const refreshRes = await originalFetch("/api/refresh", {
			method: "POST",
      		credentials: "include", // refreshToken 쿠키 자동 전송
		});

		if (!refreshRes.ok) {
			TokenManager.clearTokens();
			alert("세션이 만료되었습니다. 다시 로그인해주세요.");
			window.location.href = "/";     // 메인페이지로 이동
			throw new Error("세션 만료. 다시 로그인해주세요.");
		}

		 // 새 AccessToken 받아서 저장
		const newTokens = await refreshRes.json();
		const newAccessToken = newTokens.accessToken || newTokens.data?.accessToken;

		if(!newAccessToken){
			TokenManager.clearTokens();
			alert("세션이 만료되었습니다. 다시 로그인해주세요.");
			window.location.href = "/";
			throw new Error("새 AccessToken 발급 실패");
		}
		
		TokenManager.updateAccessToken(newAccessToken);
		// 새 토큰으로 재요청
		options.headers = {
			...options.headers,
			Authorization:`Bearer ${newAccessToken}`,
		};
		res = await originalFetch(url, options);
		console.log('🔁 새 토큰으로 재요청 결과:', res.status);
		
	}


	// 여기서도 여전히 401이면 (블랙리스트 등)
	if (res.status === 401) {
  console.warn("🚨 [전역 tokenApi.js] 세션 만료 감지됨!");
  TokenManager.clearTokens();
  alert("세션 만료 테스트 중 (3초 후 redirect)");
  setTimeout(() => {
    window.location.href = "/";
  }, 3000);
  throw new Error("401 Unauthorized");
}
	return res;
};
