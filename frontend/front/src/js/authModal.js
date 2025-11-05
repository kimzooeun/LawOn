// ============================================
// 맞춤형 상담 (로그인/회원가입) 모달
// ============================================

const authModal = document.getElementById('authModal');
const authOverlay = document.getElementById('auth-overlay');
const authCloseBtn = document.getElementById('authClose');
const portalRoot  = document.getElementById('portal-root');
const chatWidget = document.getElementById('chat-widget');
const chatOverlay = document.getElementById('chat-overlay');


// 맞춤형 상담 버튼 클릭 시 열기
const customBtn = document.getElementById('btnCustom');
if (customBtn) {
  customBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal();
  });
}

// 모달 열기
function openAuthModal() {
  // 포털로 이동
  if (portalRoot && authOverlay && authModal) {
    portalRoot.appendChild(authOverlay);
    portalRoot.appendChild(authModal);
  }

  portalRoot.style.pointerEvents = 'auto';
  authModal.style.pointerEvents = 'auto';

  chatWidget?.classList.remove('is-open');
  chatOverlay?.classList.remove('is-open');
  chatOverlay?.style.setProperty('pointer-events', 'none');

  authModal.classList.add('is-open');
  authOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden'; // 스크롤 방지
}


// 모달 닫기
function closeAuthModal() {
  authModal.classList.remove('is-open');
  authOverlay.classList.remove('is-open');

  document.body.style.overflow = ''; // 스크롤 복원
  chatOverlay?.style.removeProperty('pointer-events');
  portalRoot.style.pointerEvents = 'none';

  // transition 끝난 후 overflow 복원
  authModal.addEventListener('transitionend', () => {
    document.body.style.overflow = '';
  }, { once: true });
  
}

// 닫기 버튼
if (authCloseBtn) {
  authCloseBtn.addEventListener('click', closeAuthModal);
}

// ESC 키로 닫기 
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && authModal.classList.contains('is-open')) {
    closeAuthModal();
  }
});


// 오버레이 클릭 시 닫기
portalRoot?.addEventListener('click', (e) => {
  if (e.target === authOverlay && authModal.classList.contains('is-open')) {
    closeAuthModal();
  }
});




// 탭 전환 (이벤트 위임 사용 → appendChild 영향 안받음)
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.auth-tab');
  if (!tab) return; // 다른 곳 클릭시 무시

  const targetTab = tab.dataset.tab; // "login" or "signup"
  if (!targetTab) return;

  // 모든 탭/콘텐츠 초기화
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.auth-content').forEach((c) => c.classList.remove('active'));

  // 클릭한 탭 활성화
  tab.classList.add('active');

  // 대응되는 콘텐츠 활성화
  const content = document.getElementById(`${targetTab}Tab`);
  if (content) {
    content.classList.add('active');
  } else {
    console.warn(`탭 콘텐츠를 찾을 수 없음: #${targetTab}Tab`);
  }
});




// 로그인 폼 제출
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nickname = document.getElementById('loginNickname').value;
    const password = document.getElementById('loginPassword').value;

    // 여기에 실제 로그인 로직 추가
    console.log('로그인:', nickname, password);
  });
}

// 회원가입 폼 제출
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nickname = document.getElementById('signName').value;
    const password = document.getElementById('signPassword').value;
    const password2 = document.getElementById('signPassword2').value;

    if (password !== password2) {
      document.getElementById('signupError').classList.add('show');
      return;
    }

    // 여기에 실제 회원가입 로직 추가
    console.log('회원가입:', nickname, password);
  });
}