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

  // 간편 상담 열기 
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
      
      setTimeout(()=>{ // 부드러운 자동 스크롤
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



  // ======================== 맞춤형 상담 ===========================
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-role="custom"]');
    if(!a) return;
    e.preventDefault();
    // 페이지 페이드 아웃 효과(선택)
    document.body.style.transition='opacity .25s ease';
    document.body.style.opacity='0';

     // 로그인/회원가입 모달 열기
    const event = new CustomEvent('open-auth-modal', { detail: { tab: 'login' } });
    document.dispatchEvent(event);
    
  });

})();


// 로그인 / 회원가입 모달
(function(){
  const qs=(s,r=document)=>r.querySelector(s);
  const overlayEl = ()=>qs('#overlay');
  const modalEl   = ()=>qs('#authModal');
  const tabLogin  = ()=>qs('#tab-login');
  const tabSignup = ()=>qs('#tab-signup');
  const panelLogin= ()=>qs('#panel-login');
  const panelSignup=()=>qs('#panel-signup');
  const loginError= ()=>qs('#loginError');
  const signupError=()=>qs('#signupError');

  // 탭 스위치
  function switchTab(which){
    const tl=tabLogin(), ts=tabSignup(), pl=panelLogin(), ps=panelSignup();
    const loginOn = which==='login';
    tl?.classList.toggle('active', loginOn);
    ts?.classList.toggle('active', !loginOn);
    tl?.setAttribute('aria-selected', String(loginOn));
    ts?.setAttribute('aria-selected', String(!loginOn));
    if(pl&&ps){ pl.style.display = loginOn ? 'block' : 'none'; ps.style.display = loginOn ? 'none' : 'block'; }
  }

  // 로그인 모달 열기/닫기
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

  // "open-auth-modal" 이벤트 받으면 로그인 모달 열기 
  document.addEventListener('open-auth-modal', (e)=>{
    openAuthModal(e.detail.tab || 'login');
  });


  //  로그인 모달 닫기
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a,button');
    if(!a) return;
    if(a.id === 'authClose'){ e.preventDefault(); closeAuthModal(); }
  });
  overlayEl()?.addEventListener('click', (e)=>{ if(e.target === overlayEl()) closeAuthModal(); });



  // --------------회원가입 → 저장 후 로그인 탭으로-------------------
  panelSignup()?.addEventListener('submit', (e)=>{
    e.preventDefault();
    signupError()?.classList.remove('show');
    const name = qs('#signName')?.value.trim() || '';
    const email= qs('#signEmail')?.value.trim() || '';
    const pw   = qs('#signPassword')?.value || '';
    if(!name || !/\S+@\S+\.\S+/.test(email) || pw.length<8){
      const se=signupError(); if(se){ se.textContent='입력값을 확인하세요. (비밀번호 8자 이상)'; se.classList.add('show'); }
      return;
    }


  //   localStorage.setItem('auth.user', JSON.stringify({ name, email }));
  //   switchTab('login');
  //   const loginEmail=qs('#loginEmail'); if(loginEmail){ loginEmail.value=email; loginEmail.focus(); }
  //   const toast = qs('#toast'); if(toast){ toast.textContent='회원가입 완료! 로그인해 주세요.'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 1800); }

  
 });

  // 로그인 → Spring Security 엔드포인트로 전송
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







  // 비번 찾기(데모)
  qs('#forgotBtn')?.addEventListener('click', ()=>{
    const toast = qs('#toast'); if(toast){ toast.textContent='재설정 링크를 이메일로 보냈습니다. (데모)'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 1800); }
  });

})();



/* ===== 움직이는 채팅 미리보기 (hero-image 앵커) ===== */
(function(){
  const wrap = document.getElementById('cpMessages');
  const typing = document.getElementById('cpTyping');
  if(!wrap) return;

  const script = [
    {role:'bot',  text:'안녕하세요! 무엇을 도와드릴까요? 😊'},
    {role:'user', text:'양육비 조정 가능한가요?'},
    {role:'bot',  text:'사정변경이 있으면 법원에서 조정 가능성이 있어요.\n간단히 상황을 알려주시면 가이드 드릴게요.'},
    {role:'user', text:'최근 실직했고 소득이 절반 이하로 줄었어요.'},
    {role:'bot',  text:'최근 소득 변동 자료와 기존 합의 내역이 있으면 좋아요.\n“맞춤형 상담”으로 이어가 보실래요?'}
  ];

  let idx = 0;
  const delay = (ms)=>new Promise(r=>setTimeout(r,ms));

  function showTyping(on){ if(typing) typing.style.opacity = on ? '1' : '0'; }
  function addBubble({role, text}){
    const b = document.createElement('div');
    b.className = 'cp-bubble ' + (role === 'user' ? 'user' : 'bot');
    b.textContent = text;
    wrap.appendChild(b);
    wrap.scrollTo({top: wrap.scrollHeight, behavior: 'smooth'});
  }
  function clearBubbles(){ wrap.innerHTML = ''; }

  async function play(){
    clearBubbles(); idx = 0;
    while(idx < script.length){
      const line = script[idx++];
      if(line.role === 'bot'){ showTyping(true); await delay(600); showTyping(false); }
      addBubble(line);
      await delay(2000);
    }
    await delay(1400);
    play(); // 루프 재생
  }

  // 뷰포트에 보일 때만 재생
  const target = document.querySelector('.cp-chat-preview');
  const io = new IntersectionObserver((ents)=>{
    ents.forEach(e=>{ if(e.isIntersecting) play(); });
  }, {threshold: 0.2});
  if(target) io.observe(target);
})();
