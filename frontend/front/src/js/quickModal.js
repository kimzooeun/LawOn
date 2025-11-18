const chatWidget = document.getElementById('chat-widget');
const chatOverlay = document.getElementById('chat-overlay');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatBody = document.getElementById('chat-body');
const loadingMessage = document.getElementById('chat-loading-message');

const chatStatus = document.getElementById('chat-status');
const chatLoginBanner = document.getElementById('chat-login-banner');
const chatGoSignup = document.getElementById('chat-go-signup');
const chatGoLogin = document.getElementById('chat-go-login');

// 세션 관리용 변수
const SIMPLE_SESSION_KEY = 'simpleChatSessionId';
let simpleSessionId = localStorage.getItem(SIMPLE_SESSION_KEY) || null;
let inputDisabled = false;


// 간편 상담 버튼 클릭 시 열기
const quickBtn = document.querySelector('[data-role="quick"]');
if (quickBtn) {
  quickBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openChat();
  });
}

// 무료로 시작하기 버튼 클릭시 열기 
const quick =document.getElementById('quick');
if (quick) {
  quick.addEventListener('click', (e) => {
    e.preventDefault();
    openChat();
  });
}


// 채팅 열기
function openChat() {
  chatWidget.classList.add('is-open');
  chatOverlay.classList.add('is-open');
  document.body.classList.add('chat-open');
  chatInput.focus();
}

// 채팅 닫기
function closeChat() {
  chatWidget.classList.remove('is-open');
  chatOverlay.classList.remove('is-open');
  document.body.classList.remove('chat-open');
}

if (closeChatBtn) {
  closeChatBtn.addEventListener('click', closeChat);
}

// 오버레이 클릭 시 닫기
if (chatOverlay) {
  chatOverlay.addEventListener('click', closeChat);
}

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && chatWidget.classList.contains('is-open')) {
    closeChat();
  }
});



// 메시지 전송
async function sendMessage() {
  if (inputDisabled) return; // 제한 걸렸으면 전송 막음

  const message = chatInput.value.trim();
  if (!message) return;

  // 유저 메시지 추가
  addMessage(message, 'user');
  chatInput.value = '';

  // 로딩 표시
  showLoading();

  try{
    const body = {query:message};
    if(simpleSessionId){
      body.session_id = simpleSessionId;
    }

    const response = await fetch("/simple-chat",{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log(data);

    // 세션 ID가 없던 상태였는데, 이번에 새로 발급됐다면 저장
    if (!simpleSessionId && data.session_id){
      simpleSessionId = data.session_id;
      localStorage.setItem(SIMPLE_SESSION_KEY, simpleSessionId);
    }

    hideLoading();

    // 봇 메시지 추가 
    addMessage(data.answer, 'bot');

    // 상태(질문 카운트, 제한 여부, 배너 등) 업데이트
    // updateChatState(data);
  } catch(err){
    console.error(err);
    hideLoading()
    addMessage('서버와 통신 중 오류가 발생했어요. 잠시 후 다시 시도해주세요 🙏', 'bot');
  }
}



// 메시지 추가 함수
function addMessage(text, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  messageDiv.textContent = text;
  chatBody.appendChild(messageDiv);
  
  // 스크롤 맨 아래로
  chatBody.scrollTop = chatBody.scrollHeight;
}

// 로딩 표시/숨김
function showLoading() {
  if(!loadingMessage || !chatBody) return;

  loadingMessage.style.display = 'block';
  chatBody.appendChild(loadingMessage); // 항상 맨 아래에 오도록
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideLoading() {
  if (!loadingMessage) return;
  loadingMessage.style.display = 'none';
}


// 전송 버튼 클릭
if (chatSendBtn) {
  chatSendBtn.addEventListener('click', sendMessage);
}

// Enter 키로 전송
if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}