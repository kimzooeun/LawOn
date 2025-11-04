// authModal.js 로그인/회원가입 모달 + API 연동
(function(){
  const qs=(s,r=document)=>r.querySelector(s);
  const modal = qs('#authModal');
  const tabLogin = qs('#tab-login');
  const tabSignup = qs('#tab-signup');
  const loginTab = qs('#loginTab');
  const signupTab = qs('#signupTab');
  const loginError = qs('#loginError');
  const signupError = qs('#signupError');
  const authClose = qs('#close-btn');

  // 탭 전환
  function switchTab(which){
    const isLogin = which === 'login';
    tabLogin.classList.toggle('active',isLogin);
    tabSignup.classList.toggle('active',!isLogin);
    loginTab.style.display = isLogin?'block':'none';
    signupTab.style.display = isLogin?'none':'block';
  }

  tabLogin?.addEventListener('click',()=>switchTab('login'));
  tabSignup?.addEventListener('click',()=>switchTab('signup'));

  // 모달 열기/닫기
  function openAuthModal(defaultTab='login'){
    switchTab(defaultTab);
    modal.classList.add('show');
  }

  function closeAuthModal(){
    modal.classList.remove('show');
    loginError?.classList.remove('show');
    signupError?.classList.remove('show');
  }

  // 열기 버튼
  document.addEventListener('click',(e)=>{
    if(e.target.closest('[data-role="custom"]')){
      e.preventDefault();
      openAuthModal();
    }
  });

  // 닫기
  authClose?.addEventListener('click', closeAuthModal);

  // ESC로 닫기
  document.addEventListener('keydown',(e)=>{
    if(e.key === 'Escape' && modal?.classList.contains('show')) closeAuthModal();
  });

  // 간편 상담 버튼 클릭 시 → 로그인모달 닫고, 간편상담 모달 열기 
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-role="quick"]');
    if(!btn) return;
    // 로그인 모달 닫기
    if(modal.classList.contains('show')) closeAuthModal();

    // 간편상담 모달 열기 (다른 스크립트의 openQuick 함수 호출)
    const quickModal = document.getElementById('quickModal');
    if(quickModal) quickModal.classList.add('show');
  });




  // ----------------로그인 처리 API --------------------------------
  const loginForm = qs('#panel-login');
  loginForm?.addEventListener('submit', async(e)=>{
    e.preventDefault();
    const nickname = qs('#loginNickname').value.trim();
    const password = qs('#loginPassword').value;
    loginError?.classList.remove('show');

    if(!nickname || password.length<8){
      loginError.textContent = '아이디/비밀번호를 확인하세요.';
      loginError.classList.add('show');
      return;
    }

    try{
      const res = await fetch('/api/auth/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nickname,password})
      });
      const data = await res.json();

      if(!res.ok){
        loginError.textContent = '로그인 실패: 아이디나 비밀번호 확인';
        loginError.classList.add('show');
      } else {
        localStorage.setItem('accessToken',data.token);
        alert('로그인 성공!');
        window.location.href='/user-profile';
      }
    }catch(err){
      loginError.textContent='서버 오류 발생';
      loginError.classList.add('show');
    }
  });

  // --------------------- 회원가입 처리 API -------------------------
  const signupForm = qs('#panel-signup');
  signupForm?.addEventListener('submit', async(e)=>{
    e.preventDefault();
    const nickname = qs('#signName').value.trim();
    const pw = qs('#signPassword').value;
    const pw2 = qs('#signPassword2').value;
    signupError?.classList.remove('show');

    if(!nickname || pw.length<8 || pw!==pw2){
      signupError.textContent='입력값 확인: 비밀번호 8자 이상 & 일치해야 합니다.';
      signupError.classList.add('show');
      return;
    }

    try{
      const res = await fetch('/api/auth/signup',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nickname,password:pw})
      });
      if(res.ok){
        alert('회원가입 완료! 로그인해주세요.');
        switchTab('login');
      } else {
        signupError.textContent='이미 존재하는 아이디거나 서버 오류';
        signupError.classList.add('show');
      }
    }catch(err){
      signupError.textContent='서버 통신 실패';
      signupError.classList.add('show');
    }
  });
})();
