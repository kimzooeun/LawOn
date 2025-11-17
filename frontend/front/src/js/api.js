import { TokenManager } from "./token.js";

// 백엔드 서버 주소
const API_BASE_URL = "/api";

/**
 * (R) 앱 로드 시 채팅 데이터 전체 조회
 */
export async function getInitialData() {
  const response = await fetch(`${API_BASE_URL}/chats`, {
    headers: getAuthHeaders(false),
  });

  console.log(response + "응답");

  if (!response.ok) {
    throw new Error("데이터 로드 실패");
  }
  return response.json(); // { recents: [...], sessions: {...}, ... } 형태
}

/**
 * (C) 새 메시지 전송 (POST /api/chat 호출)
 * @param {string} sessionId  // 세션 ID는 백엔드 DB 저장용으로 사용
 * @param {number} userId    // 사용자 ID 추가
 * @param {object} messageData (예: { role: 'user', text: '...' })
 */
export async function saveMessage(sessionId, userId, messageData) {
  // 1. 요청 경로를 /api/chat으로 변경
  const CHAT_ENDPOINT = `${API_BASE_URL}/chat`; // -> /api/chat

  // 2. 백엔드 DTO({ userMessage: '...' }) 형식에 맞춰 본문 구성
  const requestBody = {
    sessionId: sessionId, // 👈 세션 ID 추가
    userId: userId, // 👈 사용자 ID 추가
    userMessage: messageData.text, // 👈 사용자 메시지
  };

  // (세션 ID가 필요한 경우, 백엔드가 세션을 직접 관리하도록 DTO에 추가할 수 있습니다.)

  const response = await fetch(CHAT_ENDPOINT, {
    // 👈 CHAT_ENDPOINT 사용
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(requestBody), // 👈 requestBody 사용
  });

  if (!response.ok) {
    throw new Error("메시지 전송 실패");
  }
  return response.json();
}

export async function updateNickname(userId, newNickname) {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/nickname`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ display_name: newNickname }),
  });
  if (!response.ok) {
    throw new Error("닉네임 변경 실패");
  }
  return response.ok; // 성공 여부
}

/*비밀번호 변경*/
export async function updatePassword(userId, currentPassword, newPassword) {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    throw new Error("비밀번호 변경 실패");
  }
  return response.ok;
}

/* (D) 회원 탈퇴 (백엔드에 아직 구현 안 됨)*/
export async function deleteUser(userId) {
  // 👈 [수정] userId 인자 추가
  const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
    headers: getAuthHeaders(),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("회원 탈퇴 실패");
  }
  return response.ok;
}

/**
 * (C) 새 세션 생성
 * (백엔드에서 새 세션 객체를 만들어 반환한다고 가정)
 */
export async function createSession(userId) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId: userId }),
  });
  console.log(response + "새 세션 생성 응답");

  if (!response.ok) {
    throw new Error("새 세션 생성 실패");
  }
  // 백엔드에서 생성된 새 세션 객체 (예: { id: 's_server_123', ... })
  return response.json();
}

/**
 * (D) 모든 대화 삭제
 */
export async function clearAllSessions() {
  const response = await fetch(`${API_BASE_URL}/sessions/clear-all`, {
    headers: getAuthHeaders(),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("대화 전체 삭제 실패");
  }
  return response.ok;
}

/**
 * (D) 대화 삭제
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    headers: getAuthHeaders(),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("대화 삭제 실패");
  }
  return response.ok;
}

/**
 * 인증 토큰을 포함한 fetch 헤더를 반환합니다.
 * @returns {HeadersInit}
 */
function getAuthHeaders(includeContentType = true) {
  const token = TokenManager.getAccessToken(); // TokenManager에서 토큰 가져오기
  const headers = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`; // "Bearer" 접두사 포함
  }
  return headers;
}
