// 백엔드 서버 주소
const API_BASE_URL = "/api";

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

// /**
//  * (C) 새 메시지 전송
//  * @param {string} sessionId
//  * @param {object} messageData (예: { role: 'user', text: '...' })
//  */
// async function saveMessage(sessionId, messageData) {
//   const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/messages`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(messageData),
//   });
//   if (!response.ok) {
//     throw new Error("메시지 저장 실패");
//   }
//   return response.json(); // 저장된 메시지나 세션 정보 반환
// }

/**
 * (C) 새 메시지 전송 (POST /api/chat 호출)
 * @param {string} sessionId  // 세션 ID는 백엔드 DB 저장용으로 사용
 * @param {number} userId    // 사용자 ID 추가
 * @param {object} messageData (예: { role: 'user', text: '...' })
 */
async function saveMessage(sessionId, userId, messageData) {
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody), // 👈 requestBody 사용
  });

  if (!response.ok) {
    throw new Error("메시지 전송 실패");
  }
  return response.json();
}

// /**
//  * (U) 닉네임 변경
//  * @param {string} newNickname
//  */
// async function updateNickname(newNickname) {
//   const response = await fetch(`${API_BASE_URL}/user/nickname`, {
//     method: "PUT", // 또는 'PATCH'
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ nickname: newNickname }),
//   });
//   if (!response.ok) {
//     throw new Error("닉네임 변경 실패");
//   }
//   return response.ok; // 성공 여부
// }

async function updateNickname(userId, newNickname) {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/nickname`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname: newNickname }),
  });
  if (!response.ok) {
    throw new Error("닉네임 변경 실패");
  }
  return response.ok; // 성공 여부
}

// /**
//  * (U) 비밀번호 변경
//  * @param {string} currentPassword
//  * @param {string} newPassword
//  */
// async function updatePassword(currentPassword, newPassword) {
//   const response = await fetch(`${API_BASE_URL}/user/password`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ currentPassword, newPassword }),
//   });

//   if (!response.ok) {
//     // 401: 현재 비밀번호 불일치, 400: 유효성 검사 실패 등
//     throw new Error("비밀번호 변경 실패");
//   }
//   return response.ok;
// }

/*비밀번호 변경*/
async function updatePassword(userId, currentPassword, newPassword) {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    throw new Error("비밀번호 변경 실패");
  }
  return response.ok;
}

/* (D) 회원 탈퇴 (백엔드에 아직 구현 안 됨)*/
async function deleteUser(userId) {
  // 👈 [수정] userId 인자 추가
  const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
    // 👈 (가정)
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
async function createSession(userId) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: userId }),
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
