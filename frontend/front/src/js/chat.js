// ===================================
// 2. 채팅 세션 & 렌더링
// (세션/메시지 관리, 최근 대화, 삭제, 렌더링)
// ===================================

import { showToast, state, qs, Modal, loadInitialData } from "./utils.js";
import {
  createSession,
  saveMessage,
  deleteSession,
  endSession,
  restartSession,
} from "./api.js";
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

// [추가] 폴링을 위한 인터벌 ID 저장소
let pollingInterval = null;

// [추가] 폴링 시작 함수 (init.js나 createNewSession 등에서 호출 필요, 혹은 renderChat 내부에서 관리)
export function startPolling() {
  if (pollingInterval) return; // 이미 돌고 있으면 패스

  // 5초마다 데이터 동기화
  pollingInterval = setInterval(async () => {
    // 현재 채팅방이 열려있을 때만 데이터 갱신
    if (
      state.currentId &&
      !document.getElementById("chatArea").classList.contains("hidden")
    ) {
      await loadInitialData();
      // renderChat은 loadInitialData 안에서 호출됨
    }
  }, 30000);
}

// [추가] 폴링 중지 (페이지 이동 시 등)
export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
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

  // [수정 1] 메시지 전송 시작 시 폴링 중단 (화면 깜빡임 방지)
  stopPolling();

  // [수정 1] 전송 상태 잠금 시작 (이게 켜져 있으면 loadInitialData가 데이터를 덮어쓰지 않음)
  state.isSending = true;

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
      redirectToLogin();
      startPolling(); // [수정] 로그인 이동 전 폴링 재개
      return;
    }

    // ▼ [추가] 상담이 종료된 상태(end_time 있음)라면 메시지 전송 전 '자동 재시작' 수행
    if (sess.end_time || sess.endTime) {
      try {
        await restartSession(sess.id); // API 호출
        // 로컬 상태 갱신: 종료 시간 제거 (이후 메시지는 재시작 호출 안 함)
        sess.end_time = null;
        sess.endTime = null;
        showToast("상담이 재개되었습니다.", "success");
      } catch (err) {
        console.error("자동 재시작 실패:", err);
        // 재시작 실패 시에도 일단 메시지 전송 시도 (또는 여기서 return 처리 가능)
      }
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
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      console.error("메시지 저장/봇 응답 실패:", err);
      showToast("메시지 전송 실패", "error");
    } finally {
      // [수정 2] 처리가 끝나면(성공하든 실패하든) 잠금 해제 및 폴링 재개
      state.isSending = false;
      startPolling();
    }
  } else {
    // user가 아닌 경우
    state.isSending = false; // 혹시 모르니 해제
    startPolling();
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
        // await createNewSession(); // await 추가
        renderChat();
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

  // 1. 빈 화면 처리
  if (!sess || !sess.messages.length) {
    const nick = (localStorage.getItem("todak_nickname") || "게스트").trim();
    const template = document.getElementById("emptyChatTemplate");
    if (template) {
      const clone = template.content.cloneNode(true);
      clone.querySelector(".empty-hint-nickname").textContent =
        nick || "게스트";
      msgs.appendChild(clone);
    } else {
      msgs.innerHTML = `<div class="empty-hint"><p>안녕하세요, ${nick}님</p></div>`;
    }
    renderRecents();
    return;
  }

  // 2. 메시지 루프
  sess.messages.forEach((m) => {
    const div = document.createElement("div");
    div.className = "msg " + (m.role === "user" ? "user" : "bot");

    const contentWrapper = document.createElement("div");
    contentWrapper.style.display = "flex";
    contentWrapper.style.flexDirection = "column";
    contentWrapper.style.gap = "8px";
    contentWrapper.style.alignItems =
      m.role === "user" ? "flex-end" : "flex-start";

    // (1) 말풍선 (기존 코드 유지)
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const textP = document.createElement("p");
    textP.textContent = m.text;
    bubble.appendChild(textP);
    contentWrapper.appendChild(bubble);

    // (2) 카드형 버튼 (여기에 로직 추가)
    if (m.text) {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "card-actions";
      let hasButton = false; // 버튼이 추가되었는지 확인용 플래그

      // [기존] 상황 1: 경고 메시지 (상담 종료 유도)
      if (
        m.text.includes("5분 뒤 상담이") ||
        m.text.includes("상담을 종료하시려면")
      ) {
        const btnEl = createCardButton(
          "🛑",
          "상담 종료하기",
          "대화를 지금 바로 끝냅니다",
          () => handleEndSessionAction(sess.id)
        );
        actionsDiv.appendChild(btnEl);
        hasButton = true;
      }

      // [기존] 상황 2: 종료 메시지 (재시작 유도)
      if (
        m.text.includes("상담이 종료되었습니다") ||
        m.text.includes("상담 재시작")
      ) {
        const btnEl = createCardButton(
          "🔄",
          "상담 재시작하기",
          "이어서 계속 대화합니다",
          () => handleRestartSessionAction(sess.id)
        );
        actionsDiv.appendChild(btnEl);
        hasButton = true;
      }

      // [⭐ 신규] 상황 3: 변호사 추천 요청 응답 감지
      // main.py의 Special Scenario 멘트를 감지합니다.
      if (
        m.text.includes("변호사님들이 등록되어 있습니다") ||
        m.text.includes("상담 내용 요약 리포트")
      ) {
        // 버튼 1: 변호사 추천
        const btnLawyer = createCardButton(
          "⚖️",
          "변호사 추천 보기",
          "내 상황에 딱 맞는 전문가 찾기",
          () => handleRecommendLawyerAction() // 하단에 함수 정의 필요
        );
        actionsDiv.appendChild(btnLawyer);

        // 버튼 2: 상담 요약하기 (실제 기능은 상담 종료 및 리포트 생성)
        const btnReport = createCardButton(
          "📝",
          "상담 요약하기",
          "지금까지의 대화를 리포트로 저장",
          () => handleEndSessionAction(sess.id)
        );
        actionsDiv.appendChild(btnReport);

        hasButton = true;
      }

      // 버튼이 하나라도 생성되었다면 래퍼에 추가
      if (hasButton) {
        contentWrapper.appendChild(actionsDiv);
      }
    }

    div.appendChild(contentWrapper);
    msgs.appendChild(div);
  });

  msgs.scrollTop = msgs.scrollHeight;
  renderRecents();
  startPolling();
}

// --------------------------------------------------------
// [Helper] 버튼 HTML 중복 제거를 위한 헬퍼 함수 (추가 권장)
// --------------------------------------------------------
function createCardButton(icon, title, subtitle, onClickHandler) {
  const btnEl = document.createElement("button");
  btnEl.className = "card-btn";
  btnEl.innerHTML = `
      <div class="card-btn-icon">${icon}</div>
      <div class="card-btn-content">
          <span class="card-btn-title">${title}</span>
          <span class="card-btn-subtitle">${subtitle}</span>
      </div>
      <div class="card-btn-arrow">›</div>
  `;
  btnEl.onclick = onClickHandler;
  return btnEl;
}

// --------------------------------------------------------
// [Action Handlers] 하단에 추가
// --------------------------------------------------------

// [신규] 변호사 추천 페이지 이동 핸들러
function handleRecommendLawyerAction() {
  // 실제 변호사 추천 페이지 URL로 이동하거나 모달을 띄우세요.
  // 예시: 변호사 리스트 페이지로 이동
  const lawyerPageLink = document.getElementById("lawyerPage"); // 네비게이션용 요소가 있다면
  if (lawyerPageLink) {
    // SPA 방식 이동 (프로젝트 구조에 맞춰 수정하세요)
    // showPage(lawyerPageLink);
    alert("변호사 추천 페이지로 이동합니다. (기능 연결 필요)");
  } else {
    window.location.href = "/lawyer-match"; // 혹은 실제 URL
  }
}

// ---- 전송 ----
export async function handleSend(e) {
  e.preventDefault();
  const input = qs("#chatInput");
  const text = input.value.trim();
  if (!text) return;

  let sess = current();
  if (!sess) {
    const success = await createNewSession();
    if (!success) return;
  }

  await addMessage("user", text);
  input.value = "";
}

// [추가] 상담 종료 핸들러
async function handleEndSessionAction(sessionId) {
  if (!confirm("정말로 상담을 종료하시겠습니까?")) return;

  try {
    await endSession(sessionId); // api.js 호출
    showToast("상담이 종료되었습니다.", "success");
    await loadInitialData(); // 상태 갱신
  } catch (err) {
    console.error(err);
    showToast("상담 종료 처리 실패", "error");
  }
}

// [추가] 상담 재시작 핸들러
async function handleRestartSessionAction(sessionId) {
  try {
    await restartSession(sessionId); // api.js 호출
    showToast("상담이 재개되었습니다.", "success");
    await loadInitialData(); // 상태 갱신
  } catch (err) {
    console.error(err);
    showToast("상담 재시작 실패", "error");
  }
}
