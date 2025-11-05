// ============================================
// 간편 상담 채팅 위젯
// ============================================

const chatWidget = document.getElementById('chat-widget');
const chatOverlay = document.getElementById('chat-overlay');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatBody = document.getElementById('chat-body');
const chatLoading = document.getElementById('chat-loading');

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
  // 로딩 숨기기
  if (chatLoading) chatLoading.style.display = 'none';
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
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  // 유저 메시지 추가
  addMessage(message, 'user');
  chatInput.value = '';

  // 로딩 표시
  showLoading();

  // 봇 응답 시뮬레이션 (실제로는 API 호출)
  setTimeout(() => {
    hideLoading();
    addMessage('네, 알겠습니다. 더 자세한 내용을 알려주시면 도와드리겠습니다.', 'bot');
  }, 1000);
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
  if (chatLoading) {
    chatLoading.style.display = 'block';
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

function hideLoading() {
  if (chatLoading) {
    chatLoading.style.display = 'none';
  }
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