(function(){
  const qs=(s,r=document)=>r.querySelector(s);

  // ===== 간편 상담 모달 =====
  const quickModal   = qs('#quickModal');
  const quickClose   = qs('#quickClose');
  const quickForm    = qs('#quickForm');
  const quickText    = qs('#quickText');
  const quickMessages= qs('#quickMessages');   

  function openQuick(){
    quickModal?.classList.add('show');
    setTimeout(()=> quickText?.focus(), 30);
  }
  function closeQuick(){
    quickModal?.classList.remove('show');
  }

  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-role="quick"]');
    if(!a) return;
    e.preventDefault();
    openQuick();
  });

  // 닫기 버튼
  quickClose?.addEventListener('click', closeQuick);

  // ESC로 닫기
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && quickModal?.classList.contains('show')) closeQuick();
  });

  // 메시지 렌더 + 스크롤
  function appendMsg(role, text){
    if(!quickMessages) return;
    const div=document.createElement('div');
    div.className=`msg ${role}`;
    div.textContent=text;
    quickMessages.append(div);
    // 부드러운 자동 스크롤
    setTimeout(()=>{
      quickMessages.scrollTo({ top: quickMessages.scrollHeight, behavior:'smooth' });
    }, 80);
  }

  quickForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const val=(quickText?.value||'').trim();
    if(!val) return;
    appendMsg('user', val);
    quickText.value='';
    setTimeout(()=> appendMsg('bot','문의 감사합니다! 맞춤형 상담 전 간편 상담을 해드릴게요.'), 350);
  });


  // ===== 맞춤형 상담 모달 관련 =====
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-role="custom"]');
    if(!a) return;
    e.preventDefault();
    openAuthModal();
  });


})();






// -----------------------여기부터 로그인/회원가입 관련--------------------------------------
// 로그인 / 회원가입 모달
(function(){
  const qs=(s,r=document)=>r.querySelector(s);
  const overlayEl = ()=>qs('#overlay');
  const modalEl = ()=>qs('#authModal');
  const tabLogin  = ()=>qs('#tab-login');
  const tabSignup = ()=>qs('#tab-signup');
  const panelLogin= ()=>qs('#panel-login');
  const panelSignup=()=>qs('#panel-signup');
  const loginError= ()=>qs('#loginError');
  const signupError=()=>qs('#signupError');

  
  // 탭 스위치
  function switchTab(which){
    const tl=tabLogin(), ts=tabSignup();
    const loginTab = qs('#loginTab');
    const signupTab = qs('#signupTab');
    const loginOn = which === 'login';

    tl?.classList.toggle('active', loginOn);
    ts?.classList.toggle('active', !loginOn);
    tl?.setAttribute('aria-selected', String(loginOn));
    ts?.setAttribute('aria-selected', String(!loginOn));

  
    // 탭 전환 시, 로그인/회원가입 부모 영역 자체를 토글
    if (loginTab && signupTab) {
      loginTab.style.display = loginOn ? 'block' : 'none';
      signupTab.style.display = loginOn ? 'none' : 'block';
    }

  }

  // 탭 클릭 시 로그인 / 회원가입 전환
  tabLogin()?.addEventListener('click', ()=> switchTab('login'));
  tabSignup()?.addEventListener('click', ()=> switchTab('signup'));

  // 모달 열기/닫기
  function openAuthModal(defaultTab='login'){
    const ov=overlayEl(), mdl=modalEl(); if(!ov||!mdl) return;
    switchTab(defaultTab);
    ov.classList.add('show'); mdl.classList.add('show');
    setTimeout(()=>{ (defaultTab==='signup' ? qs('#signName') : qs('#loginEmail'))?.focus(); }, 30);
  }
  function closeAuthModal(){
    overlayEl()?.classList.remove('show');
    modalEl()?.classList.remove('show');
    loginError()?.classList.remove('show');
    signupError()?.classList.remove('show');
  }


  // ===== 맞춤형 상담 모달 관련 =====
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-role="custom"]');
    if(!a) return;
    e.preventDefault();
    openAuthModal();
  });

  // 전역 클릭: 맞춤형 상담 → 모달
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a,button');
    if(!a) return;
    if(a.id === 'authClose'){ e.preventDefault(); closeAuthModal(); }
  });
  overlayEl()?.addEventListener('click', (e)=>{ if(e.target === overlayEl()) closeAuthModal(); });






   // 로그인 → Spring Security 엔드포인트로 전송 예정
  panelLogin()?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    loginError()?.classList.remove('show');
    const email = qs('#loginEmail')?.value.trim() || '';
    const pw    = qs('#loginPassword')?.value || '';

    if(!/\S+@\S+\.\S+/.test(email) || pw.length<8){
      const le=loginError(); if(le){ le.textContent='이메일/비밀번호 형식을 확인하세요. (비밀번호 8자 이상)'; le.classList.add('show'); }
      return;
    }

    try {
      // Spring Security 로그인 API로 요청 (추후 백엔드와 연동)
      const res = await fetch('/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password: pw })
      });

      if(res.ok){
        window.location.href = 'chat.html'; // 성공 시 챗봇 페이지로 이동
      } else {
        const le=loginError(); if(le){ le.textContent='로그인 실패. 이메일 또는 비밀번호를 확인하세요.'; le.classList.add('show'); }
      }
    } catch(err){
      console.error('Login error:', err);
      const le=loginError(); if(le){ le.textContent='서버 연결 오류가 발생했습니다.'; le.classList.add('show'); }
    }
  });




// 회원가입 → Spring Security 엔드포인트로 전송 예정
panelSignup()?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = qs('#signName').value.trim();
  const pw = qs('#signPassword').value;
  if(!name || !/\S+@\S+\.\S+/.test(email) || pw.length<8){
      const se=signupError(); if(se){ se.textContent='입력값을 확인하세요. (비밀번호 8자 이상)'; se.classList.add('show'); }
      return;
    }

  const res = await fetch('http://localhost:8080/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: pw })
  });

  if (res.ok) {
    const toast = qs('#toast');
    toast.textContent = '회원가입 완료! 로그인해 주세요.';
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), 1800);
    switchTab('login');
  } else {
    signupError()?.classList.add('show');
  }
});

  // 비번 찾기(데모)
  qs('#forgotBtn')?.addEventListener('click', ()=>{
    const toast = qs('#toast'); if(toast){ toast.textContent='재설정 링크를 이메일로 보냈습니다. (데모)'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 1800); }
  });

})();

