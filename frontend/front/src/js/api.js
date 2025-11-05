// 백엔드 서버 주소 (Spring Boot 기본 포트 8080)
const API_BASE_URL = "http://localhost:8080/api";

/**
 * (R) 앱 로드 시 채팅 데이터 전체 조회
 */
async function getInitialData() {
  const response = await fetch(`${API_BASE_URL}/chats`);
  if (!response.ok) {
    throw new Error("데이터 로드 실패");
  }
  return response.json(); // { recents: [...], sessions: {...}, ... } 형태
}

/**
 * (C) 새 메시지 전송
 * @param {string} sessionId
 * @param {object} messageData (예: { role: 'user', text: '...' })
 */
async function saveMessage(sessionId, messageData) {
  const response = await fetch(`${API_BASE_URL}/chats/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messageData),
  });
  if (!response.ok) {
    throw new Error("메시지 저장 실패");
  }
  return response.json(); // 저장된 메시지나 세션 정보 반환
}

/**
 * (U) 닉네임 변경
 * @param {string} newNickname
 */
async function updateNickname(newNickname) {
  const response = await fetch(`${API_BASE_URL}/user/nickname`, {
    method: "PUT", // 또는 'PATCH'
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname: newNickname }),
  });
  if (!response.ok) {
    throw new Error("닉네임 변경 실패");
  }
  return response.ok; // 성공 여부
}

/**
 * (U) 비밀번호 변경
 * @param {string} currentPassword
 * @param {string} newPassword
 */
async function updatePassword(currentPassword, newPassword) {
  const response = await fetch(`${API_BASE_URL}/user/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    // 401: 현재 비밀번호 불일치, 400: 유효성 검사 실패 등
    throw new Error("비밀번호 변경 실패");
  }
  return response.ok;
}

/**
 * (C) 새 세션 생성
 * (백엔드에서 새 세션 객체를 만들어 반환한다고 가정)
 */
async function createSession() {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // 새 세션 생성 시 특별히 보낼 본문이 없을 수 있습니다.
    // body: JSON.stringify({})
  });
  if (!response.ok) {
    throw new Error("새 세션 생성 실패");
  }
  // 백엔드에서 생성된 새 세션 객체 (예: { id: 's_server_123', ... })
  return response.json();
}

/**
 * (D) 모든 대화 삭제
 */
async function clearAllSessions() {
  const response = await fetch(`${API_BASE_URL}/sessions/clear-all`, {
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
async function deleteSession(sessionId) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("대화 삭제 실패");
  }
  return response.ok;
}
