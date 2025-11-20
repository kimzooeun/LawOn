// const chatWidget = document.getElementById('chat-widget');
// const chatOverlay = document.getElementById('chat-overlay');
// const closeChatBtn = document.getElementById('close-chat-btn');
// const chatInput = document.getElementById('chat-input');
// const chatSendBtn = document.getElementById('chat-send-btn');
// const chatBody = document.getElementById('chat-body');
// const loadingMessage = document.getElementById('chat-loading-message');


// const chatLoginBanner = document.getElementById('chat-login-banner');
// const chatGoSignup = document.getElementById('chat-go-signup');
// const chatGoLogin = document.getElementById('chat-go-login');

// const authModal = document.getElementById("authModal");
// const authOverlay = document.getElementById("auth-overlay");
// const authCloseBtn = document.getElementById("authClose");
// const portalRoot = document.getElementById("portal-root");


// // 세션 관리용 변수
// const SIMPLE_SESSION_KEY = 'simpleChatSessionId';
// let simpleSessionId = localStorage.getItem(SIMPLE_SESSION_KEY) || null;
// let inputDisabled = false;


// // 간편 상담 버튼 클릭 시 열기
// const quickBtn = document.querySelector('[data-role="quick"]');
// if (quickBtn) {
//   quickBtn.addEventListener('click', (e) => {
//     e.preventDefault();
//     openChat();
//   });
// }

// // 무료로 시작하기 버튼 클릭시 열기 
// const quick =document.getElementById('quick');
// if (quick) {
//   quick.addEventListener('click', (e) => {
//     e.preventDefault();
//     openChat();
//   });
// }


// // 채팅 열기
// function openChat() {
//   chatWidget.classList.add('is-open');
//   chatOverlay.classList.add('is-open');
//   document.body.classList.add('chat-open');
//   chatInput.focus();
// }

// // 채팅 닫기
// function closeChat() {
//   chatWidget.classList.remove('is-open');
//   chatOverlay.classList.remove('is-open');
//   document.body.classList.remove('chat-open');
// }

// if (closeChatBtn) {
//   closeChatBtn.addEventListener('click', closeChat);
// }

// // 오버레이 클릭 시 닫기
// if (chatOverlay) {
//   chatOverlay.addEventListener('click', closeChat);
// }

// // ESC 키로 닫기
// document.addEventListener('keydown', (e) => {
//   if (e.key === 'Escape' && chatWidget.classList.contains('is-open')) {
//     closeChat();
//   }
// });



// // 메시지 전송
// async function sendMessage() {
//   if (inputDisabled) return; // 제한 걸렸으면 전송 막음

//   const message = chatInput.value.trim();
//   if (!message) return;

//   // 유저 메시지 추가
//   addMessage(message, 'user');
//   chatInput.value = '';

//   // 로딩 표시
//   showLoading();

//   try{
//     const body = {query:message};
//     if(simpleSessionId){
//       body.session_id = simpleSessionId;
//     }

//     const response = await fetch("/simple-chat",{
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(body),
//     });

//     const data = await response.json();
//     console.log(data);

//     // 세션 ID가 없던 상태였는데, 이번에 새로 발급됐다면 저장
//     if (!simpleSessionId && data.session_id){
//       simpleSessionId = data.session_id;
//       localStorage.setItem(SIMPLE_SESSION_KEY, simpleSessionId);
//     }

//     hideLoading();

//     // 봇 메시지 추가 
//     addMessage(data.answer, 'bot');

//     // 상태(질문 카운트, 제한 여부, 배너 등) 업데이트
//     updateChatState(data);

//   } catch(err){
//     console.error(err);
//     hideLoading()
//     addMessage('서버와 통신 중 오류가 발생했어요. 잠시 후 다시 시도해주세요 🙏', 'bot');
//   }
// }


// // 상태 업데이트 함수
// function updateChatState(data){
//   // limit_reached면 입력 막음 (5번째 질문 이후)
//   if(data.limit_reached){
//     inputDisabled = true;
//     if(chatInput) chatInput.disabled = true;
//     if(chatSendBtn) chatSendBtn.disabled = true;
//   }

//   // 로그인/ 회원가입 유도 
//   if (chatLoginBanner){
//     if (data.suggest_login){
//       chatLoginBanner.style.display='block';
//       if(chatGoSignup{
//         chatGoSignup.addEventListener('click',()=>{
//           window.location.href =''
//         })
//       })
//     } else{
//       chatLoginBanner.style.display = 'none';
//     }    
//   } a
// }

// // 메시지 추가 함수
// function addMessage(text, type) {
//   const messageDiv = document.createElement('div');
//   messageDiv.className = `chat-message ${type}`;
//   messageDiv.textContent = text;
//   chatBody.appendChild(messageDiv);
  
//   // 스크롤 맨 아래로
//   chatBody.scrollTop = chatBody.scrollHeight;
// }

// // 로딩 표시/숨김
// function showLoading() {
//   if(!loadingMessage || !chatBody) return;

//   loadingMessage.style.display = 'block';
//   chatBody.appendChild(loadingMessage); // 항상 맨 아래에 오도록
//   chatBody.scrollTop = chatBody.scrollHeight;
// }

// function hideLoading() {
//   if (!loadingMessage) return;
//   loadingMessage.style.display = 'none';
// }


// // 전송 버튼 클릭
// if (chatSendBtn) {
//   chatSendBtn.addEventListener('click', sendMessage);
// }

// // Enter 키로 전송
// if (chatInput) {
//   chatInput.addEventListener('keypress', (e) => {
//     if (e.key === 'Enter') {
//       sendMessage();
//     }
//   });
// }



// // 로그인/회원가입 모달 관련 

// // 모달 열기
// export function openAuthModal() {
//   // 포털로 이동
//   if (portalRoot && authOverlay && authModal) {
//     portalRoot.appendChild(authOverlay);
//     portalRoot.appendChild(authModal);
//   }

//   portalRoot.style.pointerEvents = "auto";
//   authModal.style.pointerEvents = "auto";

//   chatWidget?.classList.remove("is-open");
//   chatOverlay?.classList.remove("is-open");
//   chatOverlay?.style.setProperty("pointer-events", "none");

//   authModal.classList.add("is-open");
//   authOverlay.classList.add("is-open");
//   document.body.style.overflow = "hidden"; // 스크롤 방지
// }

// // 모달 닫기
// function closeAuthModal() {
//   authModal.classList.remove("is-open");
//   authOverlay.classList.remove("is-open");

//   document.body.style.overflow = ""; // 스크롤 복원
//   chatOverlay?.style.removeProperty("pointer-events");
//   portalRoot.style.pointerEvents = "none";
//   resetAuthForms();
//   // transition 끝난 후 overflow 복원
//   authModal.addEventListener(
//     "transitionend",
//     () => {
//       document.body.style.overflow = "";
//     },
//     { once: true }
//   );
// }


// // 닫기 버튼
// if (authCloseBtn) {
//   authCloseBtn.addEventListener("click", closeAuthModal);
// }

// // ESC 키로 닫기
// document.addEventListener("keydown", (e) => {
//   if (e.key === "Escape" && authModal.classList.contains("is-open")) {
//     closeAuthModal();
//   }
// });

// // 오버레이 클릭 시 닫기
// portalRoot?.addEventListener("click", (e) => {
//   if (e.target === authOverlay && authModal.classList.contains("is-open")) {
//     closeAuthModal();
//   }
// });



// // 탭 전환 (이벤트 위임 사용 → appendChild 영향 안받음)
// document.addEventListener("click", (e) => {
//   const tab = e.target.closest(".auth-tab");
//   if (!tab) return; // 다른 곳 클릭시 무시

//   const targetTab = tab.dataset.tab; // "login" or "signup"
//   if (!targetTab) return;

//   // 모든 탭/콘텐츠 초기화
//   document
//     .querySelectorAll(".auth-tab")
//     .forEach((t) => t.classList.remove("active"));
//   document
//     .querySelectorAll(".auth-content")
//     .forEach((c) => c.classList.remove("active"));

//   // 클릭한 탭 활성화
//   tab.classList.add("active");

//   // 대응되는 콘텐츠 활성화
//   const content = document.getElementById(`${targetTab}Tab`);
//   if (content) {
//     content.classList.add("active");
//   } else {
//     console.warn(`탭 콘텐츠를 찾을 수 없음: #${targetTab}Tab`);
//   }
// });


// document.addEventListener("DOMContentLoaded", () => {
//   // 회원가입 탭 클릭 시 폼 리셋
//   const tabSignup = document.getElementById("tab-signup");
//   if (tabSignup) {
//     tabSignup.addEventListener("click", () => {
//       const signupForm = document.getElementById("signupForm");
//       if (signupForm) signupForm.reset();

//       ["nickname", "password", "confirmPassword"].forEach((id) => {
//         const el = document.getElementById(`error-${id}`);
//         if (el) el.innerText = "";
//       });
//     });
//   }

//   // 로그인 탭 클릭 시 폼 리셋
//   const tabLogin = document.getElementById("tab-login");
//   if (tabLogin) {
//     tabLogin.addEventListener("click", () => {
//       const loginForm = document.getElementById("loginForm");
//       if (loginForm) loginForm.reset();
//       ["nickname", "password", "confirmPassword"].forEach((id) => {
//         const el = document.getElementById(`error-${id}`);
//         if (el) el.innerText = "";
//       });
//     });
//   }

//   // 로그인 탭으로 전환할 때 폼 리셋
//   window.switchToLoginTab = function () {
//     document.getElementById("tab-login")?.classList.add("active");
//     document.getElementById("tab-signup")?.classList.remove("active");
//     document.getElementById("loginTab")?.classList.add("active");
//     document.getElementById("signupTab")?.classList.remove("active");

//     resetAuthForms();
//   };
// });

// function resetAuthForms() {
//   // 모든 폼 리셋
//   document.getElementById("loginForm")?.reset();
//   document.getElementById("signupForm")?.reset();

//   // 모든 에러 텍스트와 show 클래스 제거
//   ["nickname", "password", "confirmPassword"].forEach((id) => {
//     const el = document.getElementById(`error-${id}`);
//     if (el) {
//       el.innerText = "";
//       el.classList.remove("show");
//     }
//   });

//   const alertEls = document.querySelectorAll(".alert-danger");
//   alertEls.forEach((el) => {
//     el.innerText = "";
//     el.classList.remove("show");
//   });
// }
