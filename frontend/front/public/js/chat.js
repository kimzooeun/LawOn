// 2. 채팅 세션 & 렌더링
// (세션/메시지 관리, 최근 대화, 삭제, 렌더링)

import { showToast, state, qs, Modal, loadInitialData } from "./utils.js";
import {
  createSession,
  saveMessage,
  deleteSession,
  endSession,
  restartSession,
} from "./api.js";
import { downloadChatPdf } from "./mypage.js";
import { showPage } from "./init.js";

const USER_ID_KEY = "todak_user_id";

// 현재 재생 중인 음성 객체
let currentUtterance = null;

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

// 세션
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

// 메시지
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

  // [추가] 봇 응답이 왔을 때는 무조건 가장 아래로 스크롤 (사용자 알림)
  const msgsContainer = qs("#messages");
  msgsContainer.scrollTop = msgsContainer.scrollHeight;

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

    // [추가] 상담이 종료된 상태(end_time 있음)라면 메시지 전송 전 '자동 재시작' 수행
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

// 최근 저장
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

// 삭제 기능
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

// 삭제 애니메이션
// async await 추가
export async function animateAndDeleteRecent(li, id) {
  const item = li.querySelector(".recent-item");
  if (!item) {
    await deleteRecent(id);
    return;
  }
  item.classList.add("removing");
  item.addEventListener(
    "animationend",
    async () => {
      await deleteRecent(id);
    },
    { once: true }
  );
}

// [신규 기능] TTS 토글 함수
function toggleTTS(text, btnElement) {
  const synth = window.speechSynthesis;

  // 1. 이미 말하고 있는 경우 (중지 기능)
  if (synth.speaking && currentUtterance) {
    synth.cancel();
    currentUtterance = null;

    // 모든 버튼의 speaking 클래스 제거
    document
      .querySelectorAll(".tts-btn")
      .forEach((btn) => btn.classList.remove("speaking"));
    return;
  }

  // 2. 새로운 텍스트 읽기
  // 기존에 켜진 버튼들 초기화
  document
    .querySelectorAll(".tts-btn")
    .forEach((btn) => btn.classList.remove("speaking"));

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR"; // 한국어 설정
  utterance.rate = 1.0; // 속도 (1.0이 기본)
  utterance.pitch = 1.0; // 높낮이

  // 읽기 시작 이벤트
  utterance.onstart = () => {
    btnElement.classList.add("speaking");
  };

  // 읽기 종료 이벤트
  utterance.onend = () => {
    btnElement.classList.remove("speaking");
    currentUtterance = null;
  };

  // 에러 발생 시
  utterance.onerror = () => {
    btnElement.classList.remove("speaking");
    currentUtterance = null;
  };

  currentUtterance = utterance;
  synth.speak(utterance);
}

// 렌더링
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
      : "시간 정보 없음"; // 유효성 검사 통과 시에만 변환

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

  // [수정 1] 렌더링 전, 사용자가 '바닥 근처'를 보고 있었는지 확인
  // (scrollTop + clientHeight가 scrollHeight와 비슷하면 바닥에 있는 것임)
  const threshold = 100; // 오차 범위 (픽셀)
  const isNearBottom =
    msgs.scrollHeight - msgs.scrollTop <= msgs.clientHeight + threshold;

  // 현재 스크롤 위치 저장
  const prevScrollTop = msgs.scrollTop;

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

    // [추가] 봇 메시지인 경우 TTS(스피커) 버튼 추가
    if (m.role === "bot" && m.text) {
      const ttsBtn = document.createElement("button");
      ttsBtn.className = "tts-btn";
      ttsBtn.title = "내용 듣기";
      // 스피커 아이콘 SVG (마이크 대신 듣기 기능엔 스피커가 적합하여 스피커 아이콘 적용)
      ttsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      `;

      // 버튼 클릭 이벤트
      ttsBtn.onclick = (e) => {
        e.stopPropagation(); // 버블 클릭 이벤트 전파 방지
        toggleTTS(m.text, ttsBtn);
      };

      bubble.appendChild(ttsBtn);
    }

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
          () => handleSummaryAndDownloadAction(sess.id)
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

  // [수정 2] 스크롤 위치 결정 (스마트 스크롤)
  if (isNearBottom) {
    // 이전에 바닥을 보고 있었다면(혹은 첫 로딩) -> 맨 아래로
    msgs.scrollTop = msgs.scrollHeight;
  } else {
    // 이전에 위쪽을 보고 있었다면 -> 읽던 위치 유지
    msgs.scrollTop = prevScrollTop;
  }

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

/**
 * [수정] 변호사 추천 핸들러
 * 1. API로 변호사 전체 목록 조회
 * 2. 현재 세션의 키워드 분석
 * 3. 지역별 1명씩 랜덤/추천 선별
 * 4. 채팅창에 카드 렌더링
 */
async function handleRecommendLawyerAction() {
  const sess = current();
  if (!sess) return;

  // 1. 로딩 표시 (선택 사항)
  showToast("맞춤 변호사를 찾고 있습니다...", "info");

  try {
    // 2. 변호사 데이터 가져오기 (api.js에 함수가 없다면 fetch 직접 사용)
    const response = await fetch("/api/lawyers");
    if (!response.ok) throw new Error("데이터 로드 실패");
    const allLawyers = await response.json();

    // 3. 추천 로직 실행
    const recommended = selectBestLawyers(allLawyers, sess);

    if (recommended.length === 0) {
      showToast("조건에 맞는 변호사를 찾지 못했습니다.", "error");
      return;
    }

    // 4. 채팅창에 봇 메시지로 결과 뿌리기
    appendLawyerGridMessage(recommended);
  } catch (err) {
    console.error("변호사 추천 실패:", err);
    showToast("추천 정보를 불러오는데 실패했습니다.", "error");
  }
}

// --------------------------------------------------------
// [Logic Helpers] 추천 로직 및 렌더링
// --------------------------------------------------------

// 지역 분류 함수 (lawyer.js와 로직 동일하게 유지)
function getRegion(address) {
  if (!address) return "기타";
  const addr = address.trim();
  if (addr.includes("서울") || addr.includes("경기") || addr.includes("인천"))
    return "서울·수도권";
  if (
    addr.includes("부산") ||
    addr.includes("대구") ||
    addr.includes("울산") ||
    addr.includes("경남") ||
    addr.includes("경북")
  )
    return "부산·영남권";
  if (
    addr.includes("대전") ||
    addr.includes("세종") ||
    addr.includes("충남") ||
    addr.includes("충북")
  )
    return "대전·충청권";
  if (
    addr.includes("광주") ||
    addr.includes("전남") ||
    addr.includes("전북") ||
    addr.includes("제주")
  )
    return "광주·전라·제주권";
  return "기타";
}

// 점수 기반 추천 알고리즘
function selectBestLawyers(dbList, session) {
  // 1. 검색 키워드 추출 (제목 + 최근 메시지들)
  // 예: "이혼 상담입니다" -> ["이혼", "상담"]
  const textSource = (
    session.title +
    " " +
    session.messages
      .map((m) => m.text)
      .slice(-3)
      .join(" ")
  ).toLowerCase();

  // 2. 변호사 데이터 가공 및 점수 매기기
  const scoredLawyers = dbList.map((item) => {
    let score = 0;
    // 태그(전문분야) 매칭 시 점수 부여
    const tags = (item.detailSpecialty || item.detail_specialty || "")
      .split(",")
      .map((t) => t.trim());
    tags.forEach((tag) => {
      if (tag && textSource.includes(tag)) score += 5; // 태그 일치 시 가산점
    });

    // (선택) description 매칭 시 소폭 가산점
    if (item.description && textSource.includes(item.description)) score += 1;

    return {
      ...item,
      processedRegion: getRegion(item.officeLocation || item.address),
      score: score + Math.random(), // 동점자 랜덤 섞기
    };
  });

  // 3. 지역별로 그룹화하여 최고 점수(혹은 랜덤) 1명씩 뽑기
  const regions = [
    "서울·수도권",
    "부산·영남권",
    "대전·충청권",
    "광주·전라·제주권",
  ];
  const finalSelection = [];

  regions.forEach((regionName) => {
    // 해당 지역 변호사 필터
    const candidates = scoredLawyers.filter(
      (l) => l.processedRegion === regionName
    );

    if (candidates.length > 0) {
      // 점수 내림차순 정렬
      candidates.sort((a, b) => b.score - a.score);
      // 1등 선택
      finalSelection.push(candidates[0]);
    }
  });

  // 4. 만약 4명이 안 되면 '기타'나 다른 지역에서 채워넣기 (최대 4명)
  if (finalSelection.length < 4) {
    const ids = new Set(finalSelection.map((x) => x.id));
    const others = scoredLawyers
      .filter((x) => !ids.has(x.id))
      .sort((a, b) => b.score - a.score);

    while (finalSelection.length < 4 && others.length > 0) {
      finalSelection.push(others.shift());
    }
  }

  return finalSelection.slice(0, 4); // 딱 4명만 리턴
}

// 추천 결과(그리드)를 채팅창에 붙이는 함수
function appendLawyerGridMessage(lawyers) {
  const msgs = document.getElementById("messages");

  // 1. 봇 메시지 컨테이너 생성
  const div = document.createElement("div");
  div.className = "msg bot"; // 봇 스타일

  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "flex";
  contentWrapper.style.flexDirection = "column";
  contentWrapper.style.gap = "8px";
  contentWrapper.style.alignItems = "flex-start";

  // 2. 안내 멘트 버블
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML =
    "<p>고객님의 상황에 맞는 지역별 전문 변호사님들을 찾았습니다.</p>";
  contentWrapper.appendChild(bubble);

  // 3. 2x2 그리드 컨테이너
  const gridDiv = document.createElement("div");
  gridDiv.className = "lawyer-grid-container";

  lawyers.forEach((lawyer) => {
    // 데이터 필드 정리
    const name = lawyer.name;
    const office = lawyer.office || lawyer.officeName || "법률사무소";
    const imgUrl = lawyer.imageUrl || lawyer.image_url || "";
    // 태그: 문자열이면 배열로 변환, 최대 2개만 노출
    let tags = (lawyer.detailSpecialty || lawyer.detail_specialty || "").split(
      ","
    );
    tags = tags.filter(Boolean).slice(0, 2);

    // 카드 HTML 생성
    const card = document.createElement("div");
    card.className = "chat-lawyer-card";

    // 이미지 처리
    if (imgUrl && imgUrl.startsWith("http")) {
      card.innerHTML += `<img src="${imgUrl}" alt="${name}" class="chat-lawyer-img">`;
    } else {
      // 이미지가 없으면 기본 아이콘
      card.innerHTML += `
        <div class="chat-lawyer-img" style="display:flex;align-items:center;justify-content:center;background:#eee;color:#999;">
           ⚖️
        </div>`;
    }

    // 텍스트 정보
    let tagsHtml = tags
      .map((t) => `<span class="chat-lawyer-tag">#${t.trim()}</span>`)
      .join("");

    card.innerHTML += `
      <div class="chat-lawyer-name">${name} 변호사</div>
      <div class="chat-lawyer-office">${office}</div>
      <div class="chat-lawyer-tags">${tagsHtml}</div>
    `;

    // 클릭 시 해당 변호사 페이지로 이동 (예시 URL)
    card.onclick = () => {
      // lawyer.js에 있는 검색 로직을 활용하기 위해 URL 파라미터 사용 또는 새창
      // 예: /lawyer/detail.html?id=...
      // 여기서는 구글 검색 또는 특정 페이지로 이동시킴
      window.open(
        `/lawyer/lawfirm.html?office=${encodeURIComponent(office)}`,
        "_blank"
      );
    };

    gridDiv.appendChild(card);
  });

  contentWrapper.appendChild(gridDiv);
  div.appendChild(contentWrapper);
  msgs.appendChild(div);

  // 스크롤 최하단으로
  msgs.scrollTop = msgs.scrollHeight;
}

// 전송
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

  input.value = "";
  await addMessage("user", text);
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

// 2. [⭐ 신규 추가] '상담 요약하기' 버튼용 (종료 + 자동 다운로드)
async function handleSummaryAndDownloadAction(sessionId) {
  if (!confirm("상담을 종료하고 요약 리포트를 PDF로 저장하시겠습니까?")) return;

  try {
    // (1) 상담 종료 요청 (서버에서 요약 생성 및 저장)
    await endSession(sessionId);
    showToast("상담 요약본 생성 중...", "info");

    // (2) 최신 데이터(요약 포함)를 서버에서 다시 불러옴
    await loadInitialData();

    // (3) 갱신된 세션 데이터로 PDF 다운로드 실행
    const updatedSession = state.sessions[sessionId];
    if (updatedSession) {
      showToast("PDF 다운로드를 시작합니다.", "success");
      // 데이터 로딩 시간 고려하여 약간의 딜레이 후 실행
      setTimeout(() => {
        downloadChatPdf(updatedSession);
      }, 500);
    } else {
      showToast("데이터를 불러오지 못해 다운로드에 실패했습니다.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("요약 및 다운로드 처리 실패", "error");
  }
}
