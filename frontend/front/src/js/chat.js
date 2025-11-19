// ===================================
// 2. 채팅 세션 & 렌더링
// (세션/메시지 관리, 최근 대화, 삭제, 렌더링)
// ===================================

import { showToast, state, qs, Modal } from "./utils.js";
import { createSession, saveMessage, deleteSession } from "./api.js";
import { showPage } from "./init.js";

const USER_ID_KEY = "todak_user_id";

/**
 * 로그인이 필요할 때 로그인 페이지로 리디렉션합니다.
 */
function redirectToLogin() {
  showToast("로그인이 필요합니다. 로그인 페이지로 이동합니다.", "error", 2000);
  setTimeout(() => {
    // index.html 또는 / 등 실제 로그인 페이지 주소로 변경하세요.
    window.location.href = "/";
  }, 2100);
}

// ---- 세션 ----
export async function createNewSession() {
  const currentUserId = localStorage.getItem(USER_ID_KEY);

  if (!currentUserId) {
    showToast("로그인이 필요합니다. 로그인 후 다시 시도해주세요.", "error");
    // (선택적) 로그인 모달 열기
    if (typeof openAuthModal === "function") {
      redirectToLogin();
    }
    return false;
  }
  try {
    const newSession = await createSession(currentUserId);

    state.sessions[newSession.id] = newSession;
    state.currentId = newSession.id;

    renderChat(); // UI 렌더링
    return true; //
  } catch (err) {
    console.error("새 세션 생성 실패:", err);
    showToast("새 대화를 시작할 수 없습니다.", "error");
    return false; //
  }
}
export function current() {
  return state.sessions[state.currentId] || null;
}

// [추가] 로딩 말풍선 생성 헬퍼 함수
function createLoadingBubble() {
  const div = document.createElement("div");
  div.className = "msg bot loading"; // bot 스타일 상속 + loading 클래스
  div.innerHTML = `
    <div class="bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  return div;
}

// ---- 메시지 ----
export async function addMessage(role, text) {
  const sess = current();
  if (!sess) return;

  const messageData = { role, text, at: Date.now() };
  sess.messages.push(messageData);

  // 1. 화면에 사용자 메시지 먼저 그리기
  renderChat();

  // [핵심] 사용자가 보낸 메시지일 때만 서버 전송 로직 수행
  if (role === "user") {
    const currentUserId = localStorage.getItem(USER_ID_KEY); // USER_ID_KEY는 상단 선언 필요

    if (!currentUserId) {
      sess.messages.pop();
      renderChat();
      redirectToLogin(); // chat.js 내부에 선언된 함수라고 가정
      return;
    }

    // 2. [추가] API 호출 전 로딩 말풍선 붙이기
    const msgsContainer = qs("#messages");
    const loadingEl = createLoadingBubble();
    msgsContainer.appendChild(loadingEl);
    msgsContainer.scrollTop = msgsContainer.scrollHeight; // 스크롤 하단 이동

    try {
      // 3. API 호출 (대기)
      const botResponse = await saveMessage(
        sess.id,
        currentUserId,
        messageData
      );

      // 4. [추가] 응답 오면 로딩 말풍선 제거
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }

      // 5. 봇 응답 처리
      if (botResponse && botResponse.text) {
        const botMessageData = {
          role: "bot",
          text: botResponse.text,
          at: Date.now(),
        };
        sess.messages.push(botMessageData);
      }

      if (botResponse && botResponse.newTitle) {
        sess.title = botResponse.newTitle;
      }

      // 6. 최종 화면 렌더링 (봇 메시지 포함)
      renderChat();
      archiveCurrent();
    } catch (err) {
      // 에러 발생 시에도 로딩바 제거
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      console.error("메시지 저장/봇 응답 실패:", err);
      showToast("메시지 전송 실패", "error");
    }
  }
}

// ---- 메시지 ----
// export async function addMessage(role, text) {
//   const sess = current();
//   if (!sess) return;

//   const messageData = { role, text, at: Date.now() };
//   sess.messages.push(messageData); // (일단 화면에 그리기 위해 state에 추가)

//   // (낙관적 UI) 먼저 화면에 그리고
//   renderChat();

//   // [핵심] 사용자가 보낸 메시지일 때만 서버에 전송 (봇 메시지는 안 보냄)
//   if (role === "user") {
//     const currentUserId = localStorage.getItem(USER_ID_KEY);

//     if (!currentUserId) {
//       sess.messages.pop();
//       renderChat();
//       redirectToLogin();
//       return;
//     }

//     try {
//       const botResponse = await saveMessage(
//         sess.id,
//         currentUserId, // 👈 (수정) 동적 ID 사용
//         messageData
//       );

//       // 2. (중요) 서버가 반환한 봇 응답을 state에 추가
//       if (botResponse && botResponse.text) {
//         const botMessageData = {
//           role: "bot",
//           text: botResponse.text,
//           at: Date.now(),
//         };
//         sess.messages.push(botMessageData);
//       }

//       // 3. ⭐ [수정] 서버가 새 제목을 주면 state 즉시 반영 (주석 해제 및 수정)
//       if (botResponse && botResponse.newTitle) {
//         sess.title = botResponse.newTitle;
//         // state.sessions[sess.id].title = botResponse.newTitle; // 안전하게 원본 참조 업데이트
//       }

//       // 4. 봇 응답이 추가된 상태로 화면 다시 렌더링
//       renderChat();
//       archiveCurrent();
//     } catch (err) {
//       console.error("메시지 저장/봇 응답 실패:", err);
//       showToast("메시지 전송 실패", "error");
//     }
//   }
// }

// ---- 최근 저장 ----
export function archiveCurrent() {
  const sess = current();
  if (!sess || !sess.messages.length) return;
  state.recents = state.recents.filter((r) => r.id !== sess.id);
  state.recents.unshift({
    id: sess.id,
    title: sess.title,
    updatedAt: Date.now(),
  });
  renderRecents();
}

// ---- 삭제 기능 ----
// deleteRecent 함수를  변경
export async function deleteRecent(id) {
  try {
    // 1. 서버에 먼저 삭제 요청 (api.js 함수 호출)
    await deleteSession(id); //

    // 2. (API 성공 시) 로컬 state 및 UI 업데이트
    state.recents = state.recents.filter((r) => r.id !== id);
    if (state.sessions[id]) {
      delete state.sessions[id];
    }

    if (state.currentId === id) {
      state.currentId = null;
      if (state.recents.length > 0) {
        state.currentId = state.recents[0].id;
        renderChat();
      } else {
        // 새 채팅방 생성 (페이지 리로드 대신 createNewSession 호출)
        await createNewSession(); // await 추가
      }
    } else {
      renderRecents();
    }

    // 3. 성공 토스트 (animateAndDeleteRecent에서 여기로 이동)
    showToast("대화 1개 삭제했어요", "success");
  } catch (err) {
    console.error("대화 삭제 실패:", err);
    showToast("대화 삭제에 실패했습니다.", "error");
  }
}

// --- 삭제 애니메이션 ---
// async await 추가, showToast 주석 처리
export async function animateAndDeleteRecent(li, id) {
  const item = li.querySelector(".recent-item");
  if (!item) {
    await deleteRecent(id);
    // showToast("대화 1개 삭제했어요", "success");
    return;
  }
  item.classList.add("removing");
  item.addEventListener(
    "animationend",
    async () => {
      await deleteRecent(id);
      // showToast("대화 1개 삭제했어요", "success");
    },
    { once: true }
  );
}

// ---- 렌더링 ----
export function renderRecents() {
  const ul = qs("#recentList");
  ul.innerHTML = "";
  if (!state.recents.length) {
    ul.innerHTML =
      '<li><div class="recent-item"><span class="meta">최근 대화 없음</span></div></li>';
    return;
  }
  state.recents.forEach((r) => {
    const li = document.createElement("li");

    // 1. r.updatedAt 값을 Date 객체로 변환 시도
    const dateObj = new Date(r.updatedAt);
    const dateString =
      dateObj.getTime() > 0 ? dateObj.toLocaleString() : "시간 정보 없음"; // Invalid Date일 경우 대체

    li.innerHTML = `
      <div class="recent-item">
        <div class="recent-text">
          <span class="title">${r.title}</span>
          <span class="meta">${dateString}</span>
        </div>
        <button class="recent-delete" title="삭제"><span class="delete-icon">X</span></button>
      </div>`;
    li.querySelector(".recent-text").addEventListener("click", () => {
      archiveCurrent(); // 현재 채팅 저장
      state.currentId = r.id; // 새 세션 ID로 변경
      // saveStore(state);
      renderChat(); // 채팅 내용 다시 그리기

      if (typeof showPage === "function") {
        showPage(document.getElementById("chatArea"));
      } else {
        // (예외 처리)
        console.error("showPage 함수를 찾을 수 없습니다.");
        document.getElementById("chatArea")?.classList.remove("hidden");
        document.getElementById("mypageExplore")?.classList.add("hidden");
        document.getElementById("lawyerPage")?.classList.add("hidden");
        document.querySelector(".input-section")?.classList.remove("hidden");
      }
    });
    li.querySelector(".recent-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      Modal.open({
        message: "⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다",
        okText: "삭제",
        cancelText: "취소",
        // 비동기 async 추가
        onConfirm: async () => animateAndDeleteRecent(li, r.id),
      });
    });
    ul.appendChild(li);
  });
}

export function renderChat() {
  const msgs = qs("#messages");
  msgs.innerHTML = "";
  const sess = current();

  if (!sess || !sess.messages.length) {
    const nick = (localStorage.getItem("todak_nickname") || "게스트").trim();
    // 1. 템플릿 가져오기
    const template = document.getElementById("emptyChatTemplate");
    if (template) {
      // 2. 템플릿 복제 및 내용 채우기
      const clone = template.content.cloneNode(true);
      clone.querySelector(".empty-hint-nickname").textContent =
        nick || "게스트";
      // 3. 삽입
      msgs.appendChild(clone);
    } else {
      // (템플릿 실패 시 예비용)
      msgs.innerHTML = `<div class="empty-hint"><p>안녕하세요, ${
        nick || "게스트"
      }님</p></div>`;
    }

    renderRecents(); // 최근 목록은 갱신
    return;
  }

  sess.messages.forEach((m) => {
    const div = document.createElement("div");
    div.className = "msg " + (m.role === "user" ? "user" : "bot");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.text;
    div.appendChild(bubble);
    msgs.appendChild(div);
  });
  msgs.scrollTop = msgs.scrollHeight;
  renderRecents();
}

// ---- 전송 ----
export async function handleSend(e) {
  e.preventDefault();
  const input = qs("#chatInput");
  const text = input.value.trim();
  if (!text) return;

  let sess = current();
  if (!sess) {
    // 2. 👈 [추가] 세션이 없으면 (첫 메시지) -> 새로 생성
    const success = await createNewSession(); // DB에 세션 생성
    if (!success) {
      // (createNewSession 내부에서 이미 에러 토스트를 띄움)
      return; // 세션 생성 실패 시 중단
    }
  }

  // 1. 사용자 메시지를 먼저 추가 (API 호출 포함)
  await addMessage("user", text); // await 추가
  input.value = "";

  // 2. 봇 응답 시뮬레이션
  // setTimeout(async () => {
  //   // async 추가
  //   const botResponseText = "네, 재산분할 관련해서 말씀이시군요...";
  //   const newTitleFromLLM = "이혼 재산분할 상담";

  //   // 3. 봇 메시지 추가 (API 호출 포함)
  //   await addMessage("bot", botResponseText); // await 추가

  //   // 4. 제목 덮어쓰기 (이 로직은 서버로 이동하는 것이 좋음)
  //   const sess = current();
  //   if (sess) {
  //     sess.title = newTitleFromLLM;
  //     // [변경] 제목 변경 API 호출 (예: await api.updateSessionTitle(sess.id, newTitleFromLLM))
  //   }

  //   // 5. 사이드바 새로고침 (API 호출이 성공하면 archiveCurrent는 DB 조회를 다시 하도록 변경)
  //   archiveCurrent(); // 이 함수도 내부적으로 API를 호출하도록 수정 필요
  // }, 300);
}
