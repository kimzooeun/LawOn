import { TokenManager } from '/src/js/token.js';

const originalFetch = window.fetch;

const skipAuth = ["/api/login", "/api/refresh"];   // 관리자 로그인, 리프레시

window.fetch = async (url, options = {}) => {
  // S3 prsigned 또는 외부 요청은 전역 인터셉터 제외  
  if(typeof url === "string" && url.startsWith("https://")){
    return await originalFetch(url, options);
  }

  const isSkip = skipAuth.some((p) => url.includes(p));
  let token = TokenManager.getAccessToken();

  options = { ...options };
  options.headers = options.headers ? { ...options.headers } : {};
  options.credentials = "include";

  // JSON일 때만 자동 Content-Type 설정 (FormData 보호)
  if (options.body instanceof FormData === false &&
      options.body && !options.headers["Content-Type"]) {
    options.headers["Content-Type"] = "application/json";
  }

  if (token && !isSkip) {
    options.headers["Authorization"] = `Bearer ${token}`;
    
  }

  let res = await originalFetch(`${url}`, options);     
  console.log(url);
  console.log(res);



  // 백엔드에서 새 AccessToken이 헤더에 왔는지 확인 
  const newAuth = res.headers.get("Authorization");
  if (newAuth) {
    const newToken = newAuth.replace("Bearer ", "");
    TokenManager.updateAccessToken(newToken);
  }

  // 만료 → refresh
  if (res.status === 401/* || res.status === 403 */) {
    console.log("🔁 AccessToken 만료 → /api/refresh 직접 호출");
    const refreshRes = await originalFetch(`/api/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!refreshRes.ok) {
      TokenManager.clearTokens();
      alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      window.location.href = "/admin/login";
      throw new Error("관리자 세션 만료. 다시 로그인해주세요.");
    }
     // 새 AccessToken 받아서 저장
		const newTokens = await refreshRes.json();
		const freshToken = newTokens.accessToken || newTokens.data?.accessToken;

    if (!freshToken) {
      TokenManager.clearTokens();
      alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      window.location.href = "/admin/login";
      throw new Error("관리자 AccessToken 재발급 실패");
    }

    TokenManager.updateAccessToken(freshToken);

    // 새 토큰으로 재요청
		options.headers = {
			...options.headers,
			Authorization:`Bearer ${freshToken}`,
		};
    
    res = await originalFetch(`${url}`, options);
    console.log('🔁 새 토큰으로 재요청 결과:', res.status);
  }

  // 여기서도 여전히 401이면 (블랙리스트 등)
    if (res.status === 401) {
    console.warn("[전역 tokenApi.js] 세션 만료 감지됨!");
    TokenManager.clearTokens();
    alert("세션 만료 테스트 중 (3초 후 redirect)");
    setTimeout(() => {
      window.location.href = "/admin/login";
    }, 3000);
    throw new Error("401 Unauthorized");
  }
  return res;
};
