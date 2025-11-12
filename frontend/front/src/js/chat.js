// ===================================
// 2. 채팅 세션 & 렌더링
// (세션/메시지 관리, 최근 대화, 삭제, 렌더링)
// ===================================

const USER_ID_KEY = "todak_user_id";

// ---- 세션 ----
async function createNewSession() {
  const currentUserId = localStorage.getItem(USER_ID_KEY);

  if (!currentUserId) {
    showToast("로그인이 필요합니다. 로그인 후 다시 시도해주세요.", "error");
    // (선택적) 로그인 모달 열기
    if (typeof openAuthModal === "function") {
      openAuthModal();
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
function current() {
  return state.sessions[state.currentId] || null;
}

// ---- 메시지 ----
async function addMessage(role, text) {
  const sess = current();
  if (!sess) return;

  const messageData = { role, text, at: Date.now() };
  sess.messages.push(messageData); // (일단 화면에 그리기 위해 state에 추가)

  // (기존 로직)
  if (role === "user" && (!sess.title || sess.title === "새 대화"))
    sess.title = text.slice(0, 18) + (text.length > 18 ? "…" : "");

  // (낙관적 UI) 먼저 화면에 그리고
  renderChat();

  // [핵심] 사용자가 보낸 메시지일 때만 서버에 전송 (봇 메시지는 안 보냄)
  if (role === "user") {
    const currentUserId = localStorage.getItem(USER_ID_KEY);

    if (!currentUserId) {
      showToast("로그인이 필요합니다. 로그인 후 다시 시도해주세요.", "error");
      // 낙관적 UI 롤백 (화면에 그린 사용자 메시지 제거)
      sess.messages.pop();
      renderChat();

      if (typeof openAuthModal === "function") {
        openAuthModal();
      }
      return;
    }

    try {
      const botResponse = await saveMessage(
        sess.id,
        currentUserId, // 👈 (수정) 동적 ID 사용
        messageData
      );

      // 2. (중요) 서버가 반환한 봇 응답을 state에 추가
      if (botResponse && botResponse.text) {
        const botMessageData = {
          role: "bot",
          text: botResponse.text,
          at: Date.now(),
        };
        sess.messages.push(botMessageData);
      }

      // 3. (선택적) 서버가 새 제목을 주면 state에 반영
      if (botResponse && botResponse.newTitle) {
        sess.title = botResponse.newTitle;
      }

      // 4. 봇 응답이 추가된 상태로 화면 다시 렌더링
      renderChat();
      archiveCurrent();
    } catch (err) {
      console.error("메시지 저장/봇 응답 실패:", err);
      showToast("메시지 전송 실패", "error");
    }
  }
}

// ---- 최근 저장 ----
function archiveCurrent() {
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
async function deleteRecent(id) {
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
async function animateAndDeleteRecent(li, id) {
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
function renderRecents() {
  const ul = qs("#recentList");
  ul.innerHTML = "";
  if (!state.recents.length) {
    ul.innerHTML =
      '<li><div class="recent-item"><span class="meta">최근 대화 없음</span></div></li>';
    return;
  }
  state.recents.forEach((r) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="recent-item">
        <div class="recent-text">
          <span class="title">${r.title}</span>
          <span class="meta">${new Date(r.updatedAt).toLocaleString()}</span>
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

function renderChat() {
  const msgs = qs("#messages");
  msgs.innerHTML = "";
  const sess = current();
  if (!sess) {
    createNewSession();
    return;
  }

  // 빈 채팅방 환영 문구
  if (!sess.messages.length) {
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
async function handleSend(e) {
  e.preventDefault();
  const input = qs("#chatInput");
  const text = input.value.trim();
  if (!text) return;

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
