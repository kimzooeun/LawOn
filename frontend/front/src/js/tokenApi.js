import {TokenManager} from './token.js';

// Refresh Token은 자동으로 브라우저가 쿠키로 전송하게 만듦
export async function tokenApi(url, options = {}){
	let accessToken = TokenManager.getAccessToken();

	options = { ...options };
	options.headers =  options.headers || {};
	if(accessToken) options.headers['Authorization'] = `Bearer ${accessToken}`;
	options.credentials = "include";  // HttpOnly 쿠키 전송 (쿠키 자동 전송)
	
	let res = await fetch(url, options);
	console.log('res : ', res)
	
	// AccessToken 만료시 refresh 시도
	if(accessToken === null){
		if((res.status === 401 || res.status === 403 || res.status === 200)) {
		const refreshRes = await fetch("/api/refresh", {
		method : "POST", 
		credentials:"include"
	});

		if(!refreshRes.ok){
			TokenManager.clearTokens();
			throw new Error("세션 만료. 다시 로그인해주세요.");
		}

		const newTokens = await refreshRes.json();
		console.log(newTokens);
		TokenManager.updateAccessToken(newTokens.accessToken);

		options.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
		res = await fetch(url, options);
}

	}
	
	if(!res.ok) {
		const msg = await res.text();
		throw new Error(`API 요청 실패 (${res.status}) : ${msg}`);
	}

	return res.json();
}