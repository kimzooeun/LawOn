import { TokenManager } from '/src/js/token.js';

const originalFetch = window.fetch;
const skipAuth = ["/api/login", "/api/refresh"];   // 관리자 로그인, 리프레시

window.fetch = async (url, options = {}) => {
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

  let res = await originalFetch(url, options);

  // 서버에서 AccessToken 재발급 시 헤더에 포함됨
  const newAuth = res.headers.get("Authorization");
  if (newAuth) {
    const newToken = newAuth.replace("Bearer ", "");
    TokenManager.updateAccessToken(newToken);
    token = newToken;
  }

  // 만료 → refresh
  if (res.status === 401 || res.status === 403) {
    console.warn("관리자 토큰 만료 → refresh 시도");

    const refreshRes = await originalFetch("/api/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!refreshRes.ok) {
      console.error("관리자 Refresh 실패 → 로그아웃");
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      throw new Error("관리자 세션 만료");
    }

    const data = await refreshRes.json();
    const freshToken = data.accessToken;

    if (!freshToken) {
      TokenManager.clearTokens();
      window.location.href = "/admin/login.html";
      throw new Error("관리자 AccessToken 재발급 실패");
    }

    TokenManager.updateAccessToken(freshToken);

    // 새 토큰으로 재요청
    options.headers["Authorization"] = `Bearer ${freshToken}`;
    res = await originalFetch(url, options);
  }

  return res;
};
