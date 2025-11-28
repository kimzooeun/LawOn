import { TokenManager } from './token.js';

// 원본 fetch 저장
const originalFetch = window.fetch;

// 토큰 없이 호출해야 하는 API
const skipAuth = ['/api/login', '/api/signup', '/api/refresh'];

// Content-Type 자동 지정 제외 API
const skipContentType = ['/fastapi/stt', '/api/stt-proxy', '/api/stt/presign','/api/stt/recognize'];

// ★ S3 presigned 업로드인지 판별하는 조건
function isS3Url(url) {
  return url.includes("amazonaws.com"); // presigned PUT 업로드
}

window.fetch = async (url, options = {}) => {

  const isSkipAuth = skipAuth.some((path) => url.includes(path));
  const isSkipContent = skipContentType.some((path) => url.includes(path));
  const accessToken = TokenManager.getAccessToken();

  options = { ...options };
  options.headers = options.headers ? { ...options.headers } : {};

  // ==========================================================
  // 🟢 1) S3 Presigned URL이면 → 모든 헤더 제거 + 쿠키 제거
  // ==========================================================
  if (isS3Url(url)) {
    console.log("🚫 S3 Presigned URL → Authorization, Cookie, Content-Type 제거");

    return originalFetch(url, {
      method: options.method || "PUT",
      body: options.body,             // blob 그대로 전송
      headers: {                      // presigned가 요구한 딱 하나만 넣기
        "Content-Type": options.headers["Content-Type"] || "application/octet-stream"
      },
      // ❗ 쿠키 금지
      credentials: "omit"
    });
  }

  // ==========================================================
  // 🟡 2) 일반 API 요청
  // ==========================================================

  // Content-Type 자동 지정 (단, skipContent 제외)
  if (!isSkipContent) {
    if (options.body && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }
  }

  // Authorization 헤더 추가 (skipAuth 제외)
  if (accessToken && !isSkipAuth) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // refreshToken 쿠키 포함
  options.credentials = "include";

  console.log(url);

  // 실제 요청
  let res = await originalFetch(url, options);

  // ==========================================================
  // 🟣 AccessToken 재발급 처리
  // ==========================================================

  const newAuthHeader = res.headers.get("Authorization");
  if (newAuthHeader) {
    const newAccessToken = newAuthHeader.replace("Bearer ", "");
    TokenManager.updateAccessToken(newAccessToken);
    console.log("🔄 서버에서 새 AccessToken 재발급 감지:", newAccessToken);
  }

  // AccessToken 만료 → refresh 요청
  if (res.status === 401 || res.status === 403) {
    console.log("🔁 AccessToken 만료 → /api/refresh 직접 호출");

    const refreshRes = await originalFetch(`/api/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!refreshRes.ok) {
      TokenManager.clearTokens();
      alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      window.location.href = "/";
      throw new Error("세션 만료. 다시 로그인해주세요.");
    }

    const newTokens = await refreshRes.json();
    const newAccessToken = newTokens.accessToken || newTokens.data?.accessToken;

    if (!newAccessToken) {
      TokenManager.clearTokens();
      alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      window.location.href = "/";
      throw new Error("새 AccessToken 발급 실패");
    }

    TokenManager.updateAccessToken(newAccessToken);

    // 새 토큰으로 원래 요청 재시도
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${newAccessToken}`,
    };
    res = await originalFetch(url, options);
  }

  if (res.status === 401) {
    console.warn("[전역 tokenApi.js] 세션 만료 감지됨!");
    TokenManager.clearTokens();
    alert("세션 만료되었습니다. 다시 로그인해주세요.");
    setTimeout(() => {
      window.location.href = "/";
    }, 3000);
    throw new Error("401 Unauthorized");
  }

  return res;
};
