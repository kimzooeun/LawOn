// ===================================
// 2. 채팅 세션 & 렌더링
// (세션/메시지 관리, 최근 대화, 삭제, 렌더링)
// ===================================

// ---- 세션 ----
function createNewSession() {
  const id = "s_" + Date.now();
  state.sessions[id] = {
    id,
    title: "새 대화",
    createdAt: Date.now(),
    messages: [],
  };
  state.currentId = id;
  saveStore(state);
  renderChat();
}

function current() {
  return state.sessions[state.currentId] || null;
}

// ---- 메시지 ----
function addMessage(role, text) {
  const sess = current();
  if (!sess) return;
  sess.messages.push({ role, text, at: Date.now() });
  if (role === "user" && (!sess.title || sess.title === "새 대화"))
    sess.title = text.slice(0, 18) + (text.length > 18 ? "…" : "");
  saveStore(state);
  renderChat();
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
  saveStore(state);
  renderRecents();
}

// ---- 삭제 기능 ----
function deleteRecent(id) {
  state.recents = state.recents.filter((r) => r.id !== id);

  if (state.sessions[id]) {
    delete state.sessions[id];
  }

  // 만약 현재 열린 채팅을 삭제했다면, 다른 채팅으로 이동
  if (state.currentId === id) {
    state.currentId = null; // 현재 ID 비우기

    if (state.recents.length > 0) {
      // 다른 채팅이 남아있으면, 가장 위의 채팅을 활성화
      state.currentId = state.recents[0].id;
      saveStore(state);
      renderChat(); // 채팅창과 최근 목록 모두 새로고침
    } else {
      // 최근 채팅이 아예 없으면, 새 채팅 생성
      saveStore(state); // currentId가 null인 상태로 저장
      location.reload(); // 페이지를 새로고침
    }
  } else {
    // 다른 채팅(활성 상태가 아닌)을 삭제한 경우
    saveStore(state);
    renderRecents(); // 최근 목록만 새로고침
  }
}

// --- 삭제 애니메이션 ---
// async await 추가, showToast 주석 처리
function animateAndDeleteRecent(li, id) {
  const item = li.querySelector(".recent-item");
  if (!item) {
    deleteRecent(id);
    showToast("대화 1개 삭제했어요", "success");
    return;
  }
  item.classList.add("removing");
  item.addEventListener(
    "animationend",
    () => {
      deleteRecent(id);
      showToast("대화 1개 삭제했어요", "success");
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
      saveStore(state);
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
        onConfirm: () => animateAndDeleteRecent(li, r.id),
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
function handleSend(e) {
  e.preventDefault();
  const input = qs("#chatInput");
  const text = input.value.trim();
  if (!text) return;

  // 1. 사용자 메시지를 먼저 추가하고 입력창 비우기
  addMessage("user", text);
  input.value = "";

  // 🔥 상담 시작 API (첫 메시지일 때만) - 어드민 페이지 카운팅 및 상태등록
  if (!state.counselStarted) {
    state.counselStarted = true;
    reportCounselStart();
  }

  window.addEventListener("beforeunload", () => {

  fetch("http://localhost:8080/api/admin/dashboard/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: localStorage.getItem("userId") || 0,
      userNickname: localStorage.getItem("todak_nickname") || "게스트",
      status: "종료"
    })
  });

});
  
  // 2. 봇 응답 시뮬레이션 (LLM이 응답하는 데 300ms가 걸린다고 가정)
  setTimeout(() => {
    // (가정) LLM이 응답 본문과 요약 제목을 반환
    const botResponseText = "네, 재산분할 관련해서 말씀이시군요...";
    const newTitleFromLLM = "이혼 재산분할 상담"; // LLM이 생성한 요약 제목

    // 3. 봇 메시지 추가
    addMessage("bot", botResponseText);

    // 4. 현재 세션의 title을 LLM이 준 제목으로 덮어쓰기
    const sess = current(); // 현재 세션 가져오기
    if (sess) {
      sess.title = newTitleFromLLM; // <-- 핵심
    }

    // 5. 변경된 제목과 봇 메시지를 저장하고 사이드바 새로고침
    //    (이 archiveCurrent() 호출이 모든 것을 최종 저장)
    archiveCurrent();
  }, 300); // 300ms 후 실행
}
