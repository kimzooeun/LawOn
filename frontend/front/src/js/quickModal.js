// quickModal.js 간편 상담 모달 전용
(function(){
  const qs = (s, r=document)=>r.querySelector(s);
  const quickModal = qs('#quickModal');
  const quickClose = qs('#quickClose');
  const quickForm = qs('#quickForm');
  const quickText = qs('#quickText');
  const quickMessages = qs('#quickMessages');

  function openQuick(){
    quickModal?.classList.add('show');
    setTimeout(()=> quickText?.focus(), 30);
  }
  function closeQuick(){
    quickModal.classList.remove('show');
  }

  // 열기
  document.addEventListener('click',(e)=>{
    if(e.target.closest('[data-role="quick"]')) {
      e.preventDefault(); openQuick();
    }
  });


  // 닫기
  quickClose?.addEventListener('click', closeQuick);

  // ESC로 닫기
  document.addEventListener('keydown',(e)=>{
    if(e.key === 'Escape' && quickModal?.classList.contains('show')) closeQuick();
  });

  // 맞춤형 상담 버튼 클릭 시 → 간편상담 모달 닫고, 로그인 모달 열기  
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-role="custom"]');
    if(!btn) return;
    // 간편상담 모달 닫기
    if(quickModal.classList.contains('show')) closeQuick();

    // 로그인 모달 열기 (다른 스크립트의 openQuick 함수 호출)
    const authModal = document.getElementById('authModal');
    if(authModal) authModal.classList.add('show');
  });


  // ---------------API 추가해야함 메시지 추가------------------------------------------
  function appendMsg(role,text){
    const div=document.createElement('div');
    div.className=`msg ${role}`;
    div.textContent=text;
    quickMessages.append(div);
    setTimeout(()=>quickMessages.scrollTo({top:quickMessages.scrollHeight,behavior:'smooth'}),50);
  }

  // 전송
  quickForm?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const val=(quickText?.value||'').trim();
    if(!val) return;
    appendMsg('user',val);
    quickText.value='';
    setTimeout(()=> appendMsg('bot','문의 감사합니다! 맞춤형 상담 전 간편 상담을 해드릴게요.'), 350);
  });
})();
