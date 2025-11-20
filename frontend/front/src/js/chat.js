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

      // if (botResponse && botResponse.newTitle) {
      //   sess.title = botResponse.newTitle;
      // }

      // 대화 제목 자동 설정 로직 개선
      if (botResponse && botResponse.newTitle) {
        // 메시지가 2개 이하(첫 턴)일 때만 제목 적용
        if (sess.messages.length <= 2) {
          sess.title = botResponse.newTitle;
        }
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

// ---- 최근 저장 ----
export function archiveCurrent() {
  const sess = current();
  if (!sess || !sess.messages.length) return;

  const lastMsg = sess.messages[sess.messages.length - 1];

  // 1. 현재 사이드바(recents)에 저장된 이 방의 정보를 먼저 찾습니다.
  const existing = state.recents.find((r) => r.id === sess.id);

  // 2. 시간 결정 로직 개선
  // 우선 기존 목록에 있던 시간을 기본값으로 둡니다. (단순 이동 시 시간 변경 방지)
  let time = existing ? existing.updatedAt : null;

  // 3. 만약 '방금' 대화를 나눠서 lastMsg에 'at' 속성(프론트에서 생성한 시간)이 있다면
  // 그 시간으로 갱신합니다. (새로운 대화가 발생했을 때만 시간 업데이트)
  if (lastMsg.at) {
    time = lastMsg.at;
  }
  // 4. 만약 기존 시간도 없고, 방금 보낸 메시지도 아니라면(새로고침 후 첫 로드 등)
  // DB 데이터의 시간 필드를 찾아보고, 정 없으면 현재 시간을 씁니다.
  else if (!time) {
    time =
      lastMsg.createdAt ||
      lastMsg.created_at ||
      lastMsg.timestamp ||
      Date.now();
  }

  state.recents = state.recents.filter((r) => r.id !== sess.id);
  state.recents.unshift({
    id: sess.id,
    title: sess.title,
    updatedAt: time, // 결정된 시간 적용
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
    // [수정] Date 객체가 유효한지 확인: getTime() 결과가 NaN이 아니어야 함
    const isValidDate = !isNaN(dateObj.getTime());

    const dateString = isValidDate
      ? dateObj.toLocaleString()
      : "시간 정보 없음"; // 👈 유효성 검사 통과 시에만 변환

    li.innerHTML = `
      <div class="recent-item">
        <div class="recent-text">
          <span class="title">${r.title}</span>
          <span class="meta">${dateString}</span>
        </div>
        <button class="recent-delete" title="삭제"><span class="delete-icon">X</span></button>
      </div>`;
    li.querySelector(".recent-text").addEventListener("click", () => {
      // archiveCurrent(); // 현재 채팅 저장
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
}
