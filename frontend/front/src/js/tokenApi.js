import {TokenManager} from './token.js';

// 모든 API 요청 공통 함수
// API 호출(fetch 등)을 하기 전에, 자동으로 토큰과 쿠키를 포함하도록 세팅하는 유틸 함수
// 즉, 모든 API 요청에 공통으로 들어갈 옵션을 한 곳에서 관리하는 역할 
const originalFetch = window.fetch;

window.fetch = async(url, options = {}) => {
	let accessToken = TokenManager.getAccessToken();
	options = { ...options };  // 기존 options 객체를 복사해서 새 객체를 만드는 부분
	options.headers =  options.headers || {};    // 안전하게 헤더를 추가할 수 있도록 하는 준비 코드

	// body가 존재하고, Content-Type이 명시되지 않았다면 자동으로 JSON 지정
	if(options.body && !options.headers['Content-Type']){
		options.headers['Content-Type'] = 'application/json';
	}

	// 실제로 Authorization 헤더에 JWT 토큰을 붙임
	// 로그인 후 API 요청 시 인증을 위해 꼭 필요한 부분
	if(accessToken) options.headers['Authorization'] = `Bearer ${accessToken}`;	
	options.credentials = "include";  // refreshToken 쿠키 자동 전송

	let res = await originalFetch(url, options);
	console.log('📡 첫 요청 결과:', res.status);

	// AccessToken 만료 시 (401 or 403이면 refresh 시도)
	if (res.status === 401 || res.status === 403){
		console.log("🔁 AccessToken 만료 → Refresh 시도");
		
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

		// accessToken의 재발급이 올바르게 온다면
		const newTokens = await refreshRes.json();
		console.log("🔄 새 AccessToken 발급 완료:", newTokens);

		const newAccessToken = newTokens.accessToken || newTokens.data?.accessToken;

		if (newAccessToken) {
			TokenManager.updateAccessToken(newAccessToken);
			// 새 토큰으로 재요청
			options.headers = {
				...options.headers,
				Authorization:`Bearer ${newAccessToken}`,
			};
			res = await originalFetch(url, options);
			console.log('🔁 새 토큰으로 재요청 결과:', res.status);
		} else {
		throw new Error("새 AccessToken 발급 실패");
		}
	}


	// 최종 응답 처리
	if(!res.ok){
		const message = await res.text();
		console.error(`🚨 API 요청 실패 (${res.status}): ${message}`);
		throw new Error(`API 요청 실패 (${res.status}): ${message}`);
	}

	// JSON 파싱 (에러 방지용 try/catch)
	try{
		return await res.json();
	} catch(err){
		return null;
	}
};
