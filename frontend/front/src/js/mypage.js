// 탭 활성화 동기화 + 닉네임 로컬 저장 + 약관/개인정보 모달
(function(){
  // 탭
  const tabs = Array.from(document.querySelectorAll('.mp-nav .tab'));
  function syncActive(){
    const hash = location.hash || '#profile';
    tabs.forEach(t=>t.classList.toggle('active', t.getAttribute('href')===hash));
  }
  window.addEventListener('hashchange', syncActive);
  syncActive();

  // 닉네임 저장/로드/초기화
  const nicknameEl = document.getElementById('nickname');
  const nickPreview = document.getElementById('nickPreview');
  const KEY = 'todak_nickname';

  function renderPreview(){
    nickPreview.textContent = (nicknameEl.value || '게스트').trim();
  }
  function saveNickname(){
    localStorage.setItem(KEY, (nicknameEl.value || '').trim());
    alert('✅ 닉네임이 로컬에 저장되었습니다.');
    renderPreview();
  }
  function loadNickname(){
    const saved = localStorage.getItem(KEY) || '';
    nicknameEl.value = saved;
    renderPreview();
  }
  function resetNickname(){
    if(confirm('저장된 닉네임을 초기화할까요?')){
      localStorage.removeItem(KEY);
      nicknameEl.value = '';
      renderPreview();
      alert('🗑 닉네임이 초기화되었습니다.');
    }
  }

  // 이벤트 바인딩
  nicknameEl?.addEventListener('input', renderPreview);
  document.getElementById('btnSaveTop')?.addEventListener('click', (e)=>{ e.preventDefault(); saveNickname(); });
  document.getElementById('saveAllBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); saveNickname(); });
  document.getElementById('btnCancelTop')?.addEventListener('click', (e)=>{ e.preventDefault(); resetNickname(); });

  // 초기 로드
  window.addEventListener('DOMContentLoaded', loadNickname);

  // 모달 열고닫기
  const openModal  = (id)=> document.getElementById(id)?.classList.add('open');
  const closeModal = (id)=> document.getElementById(id)?.classList.remove('open');

  document.getElementById('viewTerms')?.addEventListener('click', (e)=>{ e.preventDefault(); openModal('termsModal'); });
  document.getElementById('viewPrivacy')?.addEventListener('click', (e)=>{ e.preventDefault(); openModal('privacyModal'); });

  document.querySelectorAll('[data-close]')?.forEach(btn=>{
    btn.addEventListener('click', ()=> closeModal(btn.getAttribute('data-close')) );
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){ closeModal('termsModal'); closeModal('privacyModal'); }
  });

    // =========================
  // 대화내용 전체 삭제 (로컬 + 선택적 서버)
  // =========================

  // 필요 시 환경에서 오버라이드 가능
  const CHAT_PURGE_API = window.TODAK_CHAT_PURGE_API || '/api/chats/purge';

  const openPurgeModalBtn = document.getElementById('openPurgeModal');
  const purgeModal = document.getElementById('purgeChatModal');
  const purgeConfirmInput = document.getElementById('purgeConfirmInput');
  const preserveSettingsEl = document.getElementById('preserveSettings');
  const alsoServerEl = document.getElementById('alsoServer');
  const purgeNowBtn = document.getElementById('purgeNowBtn');

  // 모달 열기
  openPurgeModalBtn?.addEventListener('click', () => {
    purgeConfirmInput.value = '';
    preserveSettingsEl.checked = true;
    alsoServerEl.checked = false;
    purgeNowBtn.disabled = true;
    purgeModal.classList.add('open');
    purgeConfirmInput.focus();
  });

  // 입력 확인(삭제 라고 써야 버튼 활성화)
  purgeConfirmInput?.addEventListener('input', () => {
    purgeNowBtn.disabled = (purgeConfirmInput.value.trim() !== '삭제');
  });

  // 모달 닫기(기존 모달 로직 재사용)
  document.querySelectorAll('[data-close="purgeChatModal"]').forEach(btn=>{
    btn.addEventListener('click', ()=> purgeModal.classList.remove('open'));
  });

  // 로컬 스토리지에서 채팅 관련 키만 삭제
  function purgeLocalChats(preserveSettings = true){
    let removed = 0;

    const PRESERVE_KEYS = preserveSettings ? ['todak_nickname'] : [];
    const maybeChatKey = (k) => {
      // 채팅/메시지/대화/기록/스레드/룸 등 흔한 키워드 포함 시 제거
      const s = k.toLowerCase();
      return /(chat|message|messages|msg|conversation|history|thread|room|dialog|talk)/.test(s);
    };

    // localStorage
    for(let i = localStorage.length - 1; i >= 0; i--){
      const key = localStorage.key(i);
      if (!key) continue;
      if (PRESERVE_KEYS.includes(key)) continue;
      if (maybeChatKey(key)){
        localStorage.removeItem(key);
        removed++;
      }
    }

    // sessionStorage (있을 경우)
    for(let i = sessionStorage.length - 1; i >= 0; i--){
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (maybeChatKey(key)){
        sessionStorage.removeItem(key);
        removed++;
      }
    }

    return removed;
  }

  // 서버 API 호출 (선택)
  async function purgeServerChats(){
    try{
      const res = await fetch(CHAT_PURGE_API, { method: 'DELETE' });
      // 2xx면 성공으로 간주
      return res.ok;
    }catch(err){
      console.warn('Server purge request failed:', err);
      return false;
    }
  }

  // 실행 버튼
  purgeNowBtn?.addEventListener('click', async ()=>{
    if(purgeConfirmInput.value.trim() !== '삭제') return;

    const preserve = !!preserveSettingsEl?.checked;
    const doServer = !!alsoServerEl?.checked;

    // 1) 로컬 삭제
    const removedCount = purgeLocalChats(preserve);

    // 2) 서버 삭제(선택)
    let serverOk = null;
    if(doServer){
      serverOk = await purgeServerChats();
    }

    // 알림
    let msg = `🧹 로컬 대화 ${removedCount}개 항목 삭제 완료.`;
    if(serverOk === true) msg += '\n🌐 서버 대화 삭제 요청 성공.';
    if(serverOk === false) msg += '\n🌐 서버 대화 삭제 요청 실패(나중에 다시 시도하세요).';

    alert(msg);

    // 모달 닫고, 필요 시 페이지 새로고침
    purgeModal.classList.remove('open');
    // location.reload(); // 필요하면 주석 해제
  });

})();


// 🔔 긴급 알람 버튼
  const emergencyBtn = document.getElementById('emergencyBtn');
  const emergencyModal = document.getElementById('emergencyModal');

  emergencyBtn?.addEventListener('click', () => {
    emergencyModal.classList.add('open');
  });

  document.querySelectorAll('[data-close="emergencyModal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      emergencyModal.classList.remove('open');
    });
  });