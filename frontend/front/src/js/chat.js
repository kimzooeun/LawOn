// ===========================
// 토닥토닥 채팅 테스트 JS
// ===========================


const STORE_KEY = 'todak_chats_v1';
const STT_ENDPOINT = 'http://127.0.0.1:8000/stt'; // 로컬 Whisper 서버

const AUTO_SEND_STT = true;       // 채팅 화면 STT 결과 자동 전송

const qs = (s,r=document)=>r.querySelector(s);
// 사이드바 접힘 상태 로컬스토리지 키
const SIDEBAR_COLLAPSED_KEY = 'todak_sidebar_collapsed';

// 접힘/펼침 적용 함수
function applySidebarCollapsed(collapsed){
  const sidebar = document.getElementById('sidebar');
  if(!sidebar) return;
  sidebar.classList.toggle('collapsed', !!collapsed);
}


// ---- 스토리지 로드/저장 ----
function loadStore(){
  try{
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { recents:[], sessions:{}, currentId:null };
  }catch{ return { recents:[], sessions:{}, currentId:null }; }
}
function saveStore(s){ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

let state = loadStore();

// [ADD] Confirm Modal helpers
const Modal = {
  el: null, msgEl: null, okBtn: null, cancelBtn: null, backdrop: null, lastFocus: null,
  init(){
    this.el = document.getElementById('confirmModal');
    if(!this.el) return;
    this.msgEl = document.getElementById('confirmDesc');
    this.okBtn = document.getElementById('confirmOk');
    this.cancelBtn = document.getElementById('confirmCancel');
    this.backdrop = this.el.querySelector('.modal-backdrop');
  },
  open({message='⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다', okText='삭제', cancelText='취소', onConfirm}={}){
    if(!this.el) return;
    this.lastFocus = document.activeElement;
    this.msgEl.textContent = message;
    this.okBtn.textContent = okText;
    this.cancelBtn.textContent = cancelText;
    const close = () => this.close();
    const confirm = () => { this.close(); onConfirm && onConfirm(); };
    this.okBtn.onclick = confirm;
    this.cancelBtn.onclick = close;
    this.backdrop.onclick = close;
    document.addEventListener('keydown', this._esc = (e)=>{ if(e.key==='Escape') close(); }, { once:true });
    this.el.classList.remove('hidden');
    this.okBtn.focus();
  },
  close(){
    if(!this.el) return;
    this.el.classList.add('hidden');
    this.okBtn.onclick = null;
    this.cancelBtn.onclick = null;
    this.backdrop.onclick = null;
    document.removeEventListener('keydown', this._esc);
    this.lastFocus && this.lastFocus.focus();
  }
};

// --- Toast ---
let toastTimer = null;
function showToast(text, variant='info', ms=1800){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = text;
  el.className = `toast show ${variant}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.className = 'toast'; }, ms);
}
function showDeleteWarning(){
  showToast('⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다', 'info', 2500);
}

// ---- 세션 ----
function createNewSession(){
  const id = 's_'+Date.now();
  state.sessions[id] = {id, title:'새 대화', createdAt:Date.now(), messages:[]};
  state.currentId = id;
  saveStore(state);
  renderChat();
}
function current(){ return state.sessions[state.currentId] || null; }

// ---- 메시지 ----
function addMessage(role,text){
  const sess=current(); if(!sess) return;
  sess.messages.push({role,text,at:Date.now()});
  if(role==='user' && (!sess.title||sess.title==='새 대화'))
    sess.title=text.slice(0,18)+(text.length>18?'…':'');
  saveStore(state); renderChat();
}

// ---- 최근 저장 ----
function archiveCurrent(){
  const sess=current(); if(!sess||!sess.messages.length) return;
  state.recents = state.recents.filter(r=>r.id!==sess.id);
  state.recents.unshift({id:sess.id,title:sess.title,updatedAt:Date.now()});
  saveStore(state); renderRecents();
}

// ---- 삭제 기능 ----
function deleteRecent(id){
  state.recents = state.recents.filter(r=>r.id!==id);
  if(state.sessions[id] && state.currentId!==id) delete state.sessions[id];
  saveStore(state); renderRecents();
}
function clearAllRecents(){
  if(!state.recents.length) return;
  if(!confirm('최근 대화를 모두 삭제할까요?')) return;
  const keep = state.currentId;
  state.recents.forEach(r=>{ if(r.id!==keep) delete state.sessions[r.id]; });
  state.recents=[]; saveStore(state); renderRecents();
}

// --- 삭제 애니메이션 ---
function animateAndDeleteRecent(li, id){
  const item = li.querySelector('.recent-item');
  if(!item){ deleteRecent(id); showToast('대화 1개 삭제했어요', 'success'); return; }
  item.classList.add('removing');
  item.addEventListener('animationend', ()=>{
    deleteRecent(id);
    showToast('대화 1개 삭제했어요', 'success');
  }, { once:true });
}
function clearAllRecentsWithoutPrompt(){
  const keep = state.currentId;
  state.recents.forEach(r=>{ if(r.id!==keep) delete state.sessions[r.id]; });
  state.recents=[]; saveStore(state); renderRecents();
}
function animateAndClearAllRecents(){
  const list = document.getElementById('recentList');
  const lis = Array.from(list.children);
  if(lis.length===0){ showToast('비울 최근 대화가 없어요', 'info'); return; }
  lis.forEach((li, idx)=>{
    const item = li.querySelector('.recent-item');
    if(item) setTimeout(()=> item.classList.add('removing-all'), idx*40);
  });
  const last = lis[lis.length-1]?.querySelector('.recent-item');
  if(last){
    last.addEventListener('animationend', ()=>{
      clearAllRecentsWithoutPrompt();
      showToast('최근 목록을 모두 비웠어요', 'success', 2000);
    }, { once:true });
  }else{
    clearAllRecentsWithoutPrompt();
    showToast('최근 목록을 모두 비웠어요', 'success', 2000);
  }
}

// ---- 렌더링 ----
function renderRecents(){
  const ul=qs('#recentList'); ul.innerHTML='';
  if(!state.recents.length){
    ul.innerHTML='<li><div class="recent-item"><span class="meta">최근 대화 없음</span></div></li>';
    return;
  }
  state.recents.forEach(r=>{
    const li=document.createElement('li');
    li.innerHTML=`
      <div class="recent-item">
        <div class="recent-text">
          <span class="title">${r.title}</span>
          <span class="meta">${new Date(r.updatedAt).toLocaleString()}</span>
        </div>
        <button class="recent-delete" title="삭제"><span class="delete-icon">X</span></button>
      </div>`;
    li.querySelector('.recent-text').addEventListener('click',()=>{state.currentId=r.id;renderChat();});
    li.querySelector('.recent-delete').addEventListener('click', e=>{
      e.stopPropagation();
      Modal.open({
        message: '⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다',
        okText: '삭제', cancelText: '취소',
        onConfirm: ()=> animateAndDeleteRecent(li, r.id)
      });
    });
    ul.appendChild(li);
  });
}
function renderChat(){
  const msgs=qs('#messages'); msgs.innerHTML='';
  const sess=current(); if(!sess){createNewSession();return;}
  if(!sess.messages.length){
    msgs.innerHTML='<div class="meta" style="text-align:center;margin-top:20px;font-size:40px;">아직도?</div>';
    renderRecents();
    return;
  }
  sess.messages.forEach(m=>{
    const div=document.createElement('div'); div.className='msg '+(m.role==='user'?'user':'bot');
    const bubble=document.createElement('div'); bubble.className='bubble'; bubble.textContent=m.text;
    div.appendChild(bubble); msgs.appendChild(div);
  });
  msgs.scrollTop=msgs.scrollHeight; renderRecents();
}

// ---- 전송 ----
function handleSend(e){
  e.preventDefault();
  const input=qs('#chatInput'); const text=input.value.trim(); if(!text) return;
  addMessage('user',text); input.value='';
  setTimeout(()=>addMessage('bot','테스트 응답: '+text),300);
}

// ===============================
// 🎙 Whisper STT (개선 버전)
// ===============================
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let chosenMime = null;
let activeMicBtn = null;
let targetInputEl = null;
let autoSubmitAfterSTT = false;
let micStream = null;

function pickSupportedMime() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm'
  ];
  for (const c of candidates) {
    if (MediaRecorder?.isTypeSupported?.(c)) return c;
  }
  return '';
}

async function initMicStream() {
  // 고품질 STT를 위한 오디오 설정
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true,       // 에코 제거
      noiseSuppression: true,       // 소음 제거
      autoGainControl: true         // 자동 감도 조정
    }
  });
}

async function startRecording() {
  try {
    if (isRecording) {
      stopRecording();
      return;
    }

    micStream = await initMicStream();
    chosenMime = pickSupportedMime();
    mediaRecorder = chosenMime
      ? new MediaRecorder(micStream, { mimeType: chosenMime })
      : new MediaRecorder(micStream);

    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      try {
        if (!audioChunks.length) {
          showToast('🎤 녹음된 데이터가 없습니다', 'info');
          return;
        }

        const mime = chosenMime || 'audio/webm';
        const ext = mime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(audioChunks, { type: mime });

        const fd = new FormData();
        fd.append('file', blob, `speech.${ext}`);

        showToast('🎧 음성 인식 중...', 'info', 3000);

        const res = await fetch(STT_ENDPOINT, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('STT HTTP ' + res.status);

        const json = await res.json();
        const text = (json.text || json.transcription || '').trim();

        if (text) {
          targetInputEl.value = text;
          showToast('✅ 인식 완료', 'success');
          if (autoSubmitAfterSTT) {
            targetInputEl.closest('form')?.requestSubmit();
          }
        } else {
          showToast('⚠ 음성 인식 불가, 좀 더 정확하게 부탁드려요!', 'info');
        }
      } catch (err) {
        console.error('STT 처리 오류:', err);
        showToast('❌ Whisper 서버 응답 오류', 'info', 3000);
      } finally {
        cleanupRecording();
      }
    };

    mediaRecorder.start();
    activeMicBtn?.classList.add('recording');
    activeMicBtn.textContent = '⏺';
    activeMicBtn.title = '녹음 중지';
    showToast('🎙 녹음 시작', 'info', 1200);
  } catch (err) {
    console.error('마이크 초기화 오류:', err);
    showToast('⚠ 마이크 접근 실패 (권한/장치 확인)', 'info', 3000);
    cleanupRecording();
  }
}

function stopRecording() {
  if (isRecording && mediaRecorder?.state !== 'inactive') {
    mediaRecorder.stop();
    showToast('🛑 녹음 중지', 'info', 1200);
  }
}

function cleanupRecording() {
  isRecording = false;
  if (activeMicBtn) {
    activeMicBtn.classList.remove('recording');
    activeMicBtn.textContent = '🎙';
    activeMicBtn.title = '음성 입력';
  }
  activeMicBtn = null;
  targetInputEl = null;
  autoSubmitAfterSTT = false;

  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
}

function bindMic(micBtnEl, inputEl, autoSubmit = false) {
  if (!micBtnEl || !inputEl) return;
  micBtnEl.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      activeMicBtn = micBtnEl;
      targetInputEl = inputEl;
      autoSubmitAfterSTT = !!autoSubmit;
      startRecording();
    }
  });
}

// ✅ 닉네임 표시
function updateNicknameDisplay(){
  const el = document.getElementById('nicknameDisplay');
  if(!el) return;
  const nick = (localStorage.getItem('todak_nickname') || '').trim();
  el.textContent = nick || '게스트';
}

// ---- 초기화 ----
document.addEventListener('DOMContentLoaded',()=>{
  Modal.init();

// ===== 문서 모달 유틸 =====
function openDocModal(title, html){
  const modal = document.getElementById('docModal');
  const titleEl = document.getElementById('docModalTitle');
  const bodyEl  = document.getElementById('docModalBody');
  if(!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = html;

  // 배경 스크롤 잠금
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // 닫기 핸들러 세팅
  const closeBtn = document.getElementById('docModalClose');
  const backdrop = modal.querySelector('.modal-backdrop');
  const cleanup = () => {
    modal.classList.add('hidden');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    closeBtn?.removeEventListener('click', cleanup);
    backdrop?.removeEventListener('click', cleanup);
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if(e.key === 'Escape') cleanup(); };

  closeBtn?.addEventListener('click', cleanup);
  backdrop?.addEventListener('click', cleanup);
  document.addEventListener('keydown', escHandler);

  modal.classList.remove('hidden');
}

  // ▶ 접힘 상태 복원
const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
applySidebarCollapsed(savedCollapsed);

// ▶ 토글 버튼 핸들러
const collapseBtn = document.getElementById('collapse-btn');
collapseBtn?.addEventListener('click', ()=>{
  const sidebar = document.getElementById('sidebar');
  const willCollapse = !sidebar.classList.contains('collapsed');
  applySidebarCollapsed(willCollapse);
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, willCollapse ? '1' : '0');
});

  // 채팅 초기 바인딩
  if(!state.currentId) createNewSession();
  qs('#chatForm').addEventListener('submit',handleSend);
  qs('#newChatBtn').addEventListener('click',()=>{archiveCurrent();createNewSession();});
  document.getElementById('clearRecentsBtn').addEventListener('click', ()=>{
    Modal.open({
      message: '⚠ 경고! 삭제 시 대화 내용을 되돌릴 수 없습니다',
      okText: '전체 삭제', cancelText: '취소',
      onConfirm: ()=> animateAndClearAllRecents()
    });
  });
  renderChat();

  // STT 바인딩: 채팅 화면 마이크
  const chatMicBtn = document.getElementById('micBtn');
  const chatInput = document.getElementById('chatInput');
  if(chatMicBtn && chatInput){
    bindMic(chatMicBtn, chatInput, AUTO_SEND_STT);
  }

// ✅ 닉네임 표시 초기 세팅 + 탭 간 동기화
  updateNicknameDisplay();
  window.addEventListener('storage', (e)=>{
    if(e.key === 'todak_nickname') updateNicknameDisplay();
  });
});

// === 사이드바 footer '테마 변경' 하드코딩 컬러 + 초기화 ===
(function(){
  const footer = document.querySelector('.sidebar-footer');
  if(!footer) return;

  const toggleBtn = footer.querySelector('.footer-link');
  if(!toggleBtn) return;

  // 버튼 세트 만들기
  let btnWrap = footer.querySelector('#themeButtons');
  if(!btnWrap) {
    btnWrap = document.createElement('div');
    btnWrap.id = 'themeButtons';
    btnWrap.className = 'theme-buttons hidden';
    btnWrap.innerHTML = `
      <button class="theme-chip" data-theme="yellow">Yellow</button>
      <button class="theme-chip" data-theme="white">White</button>
      <button class="theme-chip" data-theme="purple">Purple</button>
      <button class="theme-chip" data-theme="orange">Orange</button>
      <button class="theme-chip" data-theme="green">Green</button>
      <button class="theme-chip reset" id="themeReset">Reset</button>
    `;
    footer.appendChild(btnWrap);
  }

  // 하드코딩 컬러 세트
  const themes = {
    yellow:  {
      bg: "#FFFBEA", text: "#3A2A00", card: "#FFF2C9", accent: "#FFD93D"
    },
    white:  {
      bg: "#ffffff", text: "#222222", card: "#f7f7f8", accent: "#4d88ff"
    },
    purple: {
      bg: "#faf7ff", text: "#221a2e", card: "#ede7ff", accent: "#a27ff7"
    },
    orange: {
      bg: "#fff8f1", text: "#3a2a1e", card: "#ffe9d6", accent: "#ff8a00"
    },
    green:  {
      bg: "#f4fbf7", text: "#1f2a24", card: "#e6f5ec", accent: "#58b48f"
    },
    reset:  {
      bg: "#fff6fb", text: "#221a2e", card: "#fff6fb", accent: "#fff"
    }
  };

  const body = document.body;
  const main = document.querySelector('.chat-wrapper') || document.querySelector('main');
  const sidebar = document.querySelector('.sidebar');
  const inputBar = document.querySelector('.input-area');
  const sendBtn = document.querySelector('.send-btn');

  // 저장된 테마 복원
  const saved = localStorage.getItem('hard_theme');
  if(saved && themes[saved]) applyTheme(saved);

  // 토글 버튼 클릭 시 버튼목록 열기/닫기
  toggleBtn.addEventListener('click', ()=>{
    btnWrap.classList.toggle('hidden');
  });

  // 테마 선택
  btnWrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('.theme-chip');
    if(!btn) return;

    const theme = btn.dataset.theme || (btn.id === 'themeReset' ? 'reset' : null);
    if(!theme || !themes[theme]) return;

    applyTheme(theme);
    if(theme === 'reset') localStorage.removeItem('hard_theme');
    else localStorage.setItem('hard_theme', theme);
  });

  // 밖 클릭 시 닫기
  document.addEventListener('click',(e)=>{
    if(!e.target.closest('.sidebar-footer')) btnWrap.classList.add('hidden');
  });

  // === 핵심 함수: 실제 색상 변경 ===
  function applyTheme(name){
    const t = themes[name];
    if(!t) return;

    // 배경 / 글자
    body.style.backgroundColor = t.bg;
    body.style.color = t.text;

    // 주요 영역
    if(main){
      main.style.backgroundColor = t.card;
      main.style.borderColor = t.accent;
    }
    if(sidebar){
      sidebar.style.backgroundColor = t.card;
      sidebar.style.borderColor = t.accent;
    }
    if(inputBar){
      inputBar.style.backgroundColor = t.card;
      inputBar.style.borderColor = t.accent;
    }
    if(sendBtn){
      sendBtn.style.backgroundColor = t.accent;
      sendBtn.style.color = "#fff";
    }
  }
})();

// === [ADD] 탐색형 마이페이지 전환 & 검색/필터 ===
(function(){
  // 안전 토스트
  function toast(msg){
    const el = document.getElementById('toast');
    if(!el){ alert(msg); return; }
    el.textContent = msg; el.classList.add('show');
    setTimeout(()=> el.classList.remove('show'), 1600);
  }

  const exploreBtn = document.getElementById('exploreBtn');
  const explore    = document.getElementById('mypageExplore');
  const chatArea   = document.getElementById('chatArea');
  const inputSec   = document.querySelector('.input-section');

  if(!exploreBtn || !explore || !chatArea) return;

  // 버튼 라벨을 '마이페이지'로
  const txt = exploreBtn.querySelector('.nav-text');
  if(txt) txt.textContent = '마이페이지';

  // 열고 닫기
  const open = () => {
    explore.classList.remove('hidden');
    chatArea.classList.add('hidden');
    inputSec && inputSec.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const close = () => {
    explore.classList.add('hidden');
    chatArea.classList.remove('hidden');
    inputSec && inputSec.classList.remove('hidden');
  };

  exploreBtn.addEventListener('click', open);
  document.getElementById('mpxBackBtn')?.addEventListener('click', close);

  // 검색/필터
  const searchInput = document.getElementById('mpxSearch');
  const chips = explore.querySelectorAll('.chip');
  const cards = Array.from(explore.querySelectorAll('.mpx-card'));
  let currentFilter = 'all';

  function applyFilter(){
    const q = (searchInput?.value || '').trim().toLowerCase();
    cards.forEach(card=>{
      const tags = (card.getAttribute('data-tags') || '').toLowerCase();
      const inFilter = currentFilter === 'all' || tags.includes(currentFilter);
      const inSearch = !q || tags.includes(q) || card.textContent.toLowerCase().includes(q);
      card.style.display = (inFilter && inSearch) ? '' : 'none';
    });
  }

  chips.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      chips.forEach(c=> c.classList.remove('is-active'));
      chip.classList.add('is-active');
      currentFilter = chip.dataset.filter || 'all';
      applyFilter();
    });
  });
  searchInput?.addEventListener('input', applyFilter);

  // 액션: 프로젝트 로컬 키
  const NICK_KEY    = 'todak_nickname';
  const PUSH_KEY    = 'todak_push_enabled';
  const RECENTS_KEY = 'todak_recents';
  const CHATS_KEY   = 'todak_chats';

  // 디테일 패널 요소
  const detail = document.getElementById('mpxDetail');
  const detailTitle = document.getElementById('mpxDetailTitle');
  const detailBody  = document.getElementById('mpxDetailBody');
  const detailClose = document.getElementById('mpxDetailClose');
  function openDetail(title, innerHTML){
    detailTitle.textContent = title;
    detailBody.innerHTML = innerHTML;
    detail.classList.remove('hidden');
  }
  function closeDetail(){ detail.classList.add('hidden'); }
  detailClose?.addEventListener('click', closeDetail);

  // 카드 액션 핸들러
  explore.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.mpx-card-cta');
    if(!btn) return;
    const action = btn.dataset.action;

    // 공통 확인창
    const ask = (msg)=> Promise.resolve(window.confirm(msg));

    if(action === 'open-profile'){
      const current = localStorage.getItem(NICK_KEY) || '';
      openDetail('닉네임 변경', `
        <div class="field">
          <label>닉네임</label>
          <div class="row" style="display:flex; gap:8px;">
            <input id="mpxNick" type="text" value="${current.replace(/"/g,'&quot;')}" placeholder="닉네임을 입력하세요" />
            <button class="btn" id="mpxNickSave">저장</button>
          </div>
          <p class="hint">채팅 상단 칩에 바로 반영됩니다.</p>
        </div>
      `);
      document.getElementById('mpxNickSave')?.addEventListener('click', ()=>{
        const v = (document.getElementById('mpxNick')?.value || '').trim();
        localStorage.setItem(NICK_KEY, v);
        const chip = document.getElementById('nicknameDisplay');
        if(chip) chip.textContent = v || '게스트';
        toast('닉네임 저장 완료');
        closeDetail();
      });

    } else if(action === 'open-security'){
      openDetail('비밀번호 변경(데모)', `
        <div class="field">
          <label>새 비밀번호</label>
          <input type="password" id="mpxPw1" placeholder="6자 이상" />
        </div>
        <div class="field">
          <label>새 비밀번호 확인</label>
          <input type="password" id="mpxPw2" placeholder="동일하게 입력" />
        </div>
        <button class="btn" id="mpxPwChange">변경</button>
      `);
      document.getElementById('mpxPwChange')?.addEventListener('click', ()=>{
        const a = (document.getElementById('mpxPw1')?.value || '').trim();
        const b = (document.getElementById('mpxPw2')?.value || '').trim();
        if(!a || a.length < 6){ toast('비밀번호는 6자 이상'); return; }
        if(a !== b){ toast('비밀번호가 일치하지 않습니다'); return; }
        toast('비밀번호 변경(데모) 완료');
        closeDetail();
      });

    } else if(action === 'toggle-push'){
      const on = localStorage.getItem(PUSH_KEY) === '1';
      localStorage.setItem(PUSH_KEY, on ? '0' : '1');
      toast(on ? '알림 OFF' : '알림 ON');

    } else if(action === 'clear-chats'){
      if(!await ask('⚠ 삭제 시 되돌릴 수 없습니다. 전체 삭제할까요?')) return;
      localStorage.removeItem(RECENTS_KEY);
      localStorage.removeItem(CHATS_KEY);
      toast('대화 전체 비우기 완료');

    } else if(action === 'wipe-local'){
      if(!await ask('로컬 저장소 사용자 데이터를 초기화할까요?')) return;
      localStorage.removeItem(NICK_KEY);
      localStorage.removeItem(PUSH_KEY);
      localStorage.removeItem(RECENTS_KEY);
      localStorage.removeItem(CHATS_KEY);
      const chip = document.getElementById('nicknameDisplay');
      if(chip) chip.textContent = '게스트';
      toast('로컬 데이터 초기화 완료');
      
    } else if(action === 'open-emergency'){
      openDetail('긴급 연락', `
        <ul style="list-style:none; padding-left:0; margin:0; display:grid; gap:8px">
          <li><strong>112</strong> 경찰 긴급신고/ 여성폭력</li>
          <li><strong>119</strong> 화재·구급</li>
          <li><strong>1393</strong> 자살예방상담</li>
          <li><strong>1577-0199</strong> 여성긴급전화</li>
        </ul>
      `);
    }

  });
})();


/* =========================
   📜 정책/약관 오버레이 모달 - 핫픽스
   - 모달 DOM이 없으면 생성
   - data-action=open-privacy / open-terms / open-modal 모두 지원
   ========================= */
(function(){
  // 1) 모달 DOM 보장
  function ensureDocModal(){
    let modal = document.getElementById('docModal');
    if(modal) return modal;

    const html = `
      <div id="docModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="docModalTitle" aria-describedby="docModalBody">
        <div class="modal-backdrop"></div>
        <div class="modal-card modal-card--lg" role="document" style="padding:0">
          <header class="modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line);background:#fff;border-radius:14px 14px 0 0;">
            <h3 id="docModalTitle" class="modal-title" style="margin:0;font-size:18px;font-weight:800;color:var(--primary-900)">문서</h3>
            <button id="docModalClose" class="btn btn-ghost" type="button" aria-label="닫기">✕</button>
          </header>
          <div id="docModalBody" class="modal-scroll" style="padding:16px;overflow:auto;background:#fff;border-radius:0 0 14px 14px;line-height:1.65;max-height:calc(86vh - 56px)"></div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    return document.getElementById('docModal');
  }

  // 2) 열기/닫기 유틸
  function openDocModal(title, innerHTML){
    const modal = ensureDocModal();
    const titleEl = modal.querySelector('#docModalTitle');
    const bodyEl  = modal.querySelector('#docModalBody');
    const closeBtn = modal.querySelector('#docModalClose');
    const backdrop = modal.querySelector('.modal-backdrop');

    titleEl.textContent = title || '문서';
    bodyEl.innerHTML = innerHTML || '<p>내용이 없습니다.</p>';

    // 스크롤 잠금
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const cleanup = () => {
      modal.classList.add('hidden');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      closeBtn.removeEventListener('click', cleanup);
      backdrop.removeEventListener('click', cleanup);
      document.removeEventListener('keydown', escHandler);
    };
    const escHandler = (e)=>{ if(e.key === 'Escape') cleanup(); };

    closeBtn.addEventListener('click', cleanup);
    backdrop.addEventListener('click', cleanup);
    document.addEventListener('keydown', escHandler);

    modal.classList.remove('hidden');
  }

  // 3) 문서 본문 템플릿
  const TEMPLATES = {
    privacy: `
      <h4>제1조 (총칙)</h4>
        <p>prinCpal(이하 "회사"라 합니다)은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다. 회사는 본 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 이루어지고 있는지 알려드립니다. 본 방침은 "토닥토닥이" 서비스(이하 "서비스"라 합니다)에 적용됩니다.</p>

        <h4>제2조 (수집하는 개인정보 항목 및 수집방법)</h4>
        <ol>
            <li>회사는 회원가입, 원활한 고객상담, 각종 서비스의 제공을 위해 아래와 같은 최소한의 개인정보를 필수항목으로 수집하고 있습니다.
                <ul>
                    <li>필수항목: [이메일 주소, 비밀번호, 닉네임 등 서비스에 필요한 항목 기재]</li>
                    <li>선택항목: [프로필 사진, 생년월일 등 부가 서비스에 필요한 항목 기재]</li>
                </ul>
            </li>
            <li>서비스 이용 과정이나 사업 처리 과정에서 아래와 같은 정보들이 자동으로 생성되어 수집될 수 있습니다.
                <ul>
                    <li>IP 주소, 쿠키, 방문 일시, 서비스 이용 기록, 불량 이용 기록, 기기 정보(OS, 기기 식별번호)</li>
                </ul>
            </li>
            <li>수집방법: 홈페이지/모바일 앱 회원가입, 서면양식, 전화, 팩스, 상담 게시판, 이메일, 이벤트 응모</li>
        </ol>

        <h4>제3조 (개인정보의 수집 및 이용목적)</h4>
        <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
        <ol>
            <li>서비스 제공에 관한 계약 이행: 콘텐츠 제공, 본인 인증, 연령 인증</li>
            <li>회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 민원처리, 고지사항 전달</li>
            <li>신규 서비스 개발 및 마케팅·광고에의 활용: 신규 서비스 개발 및 맞춤 서비스 제공, 통계학적 특성에 따른 서비스 제공 및 광고 게재, 접속 빈도 파악, 회원의 서비스 이용에 대한 통계, 이벤트 등 광고성 정보 전달</li>
        </ol>

        <h4>제4조 (개인정보의 보유 및 이용기간)</h4>
        <p>이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.</p>
        <ol>
            <li>회사 내부 방침에 의한 정보 보유 사유 (예: 부정 이용 방지)
                <ul>
                    <li>보존 항목: [부정 이용 기록 등]</li>
                    <li>보존 이유: 부정 이용 방지</li>
                    <li>보존 기간: [예: 1년]</li>
                </ul>
            </li>
            <li>관련 법령에 의한 정보 보유 사유
                <ul>
                    <li>(예: 전자상거래 등에서의 소비자보호에 관한 법률)
                        <ul>
                            <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                            <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                        </ul>
                    </li>
                    <li>(예: 통신비밀보호법)
                        <ul>
                            <li>로그인 기록: 3개월</li>
                        </ul>
                    </li>
                </ul>
            </li>
        </ol>

        <h4>제5조 (개인정보의 파기절차 및 방법)</h4>
        <p>회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.</p>
        <ol>
            <li><strong>파기절차:</strong> 이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(제4조 보유 및 이용기간 참조) 일정 기간 저장된 후 파기됩니다.</li>
            <li><strong>파기방법:</strong> 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</li>
        </ol>

        <h4>제6조 (개인정보의 제3자 제공)</h4>
        <p>회사는 이용자의 개인정보를 제3조(개인정보의 수집 및 이용목적)에서 명시한 범위 내에서만 처리하며, 이용자의 사전 동의 없이는 동 범위를 초과하여 이용하거나 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
        <ol>
            <li>이용자들이 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
        </ol>

        <h4>제7조 (개인정보처리의 위탁)</h4>
        <p>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁할 수 있습니다.</p>
        <ul>
            <li>수탁업체: [위탁업체 명]</li>
            <li>위탁업무 내용: [위탁업무 내용 (예: 클라우드 서버 운영, 결제 처리, 고객 상담)]</li>
            <li>위탁 기간: 회원 탈퇴 시 혹은 위탁 계약 종료 시까지</li>
        </ul>
        <p>회사는 위탁계약 체결 시 관련 법령에 따라 위탁업무 수행목적 외 개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>

        <h4>제8조 (이용자 및 법정대리인의 권리와 그 행사방법)</h4>
        <ol>
            <li>이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입 해지(동의 철회)를 요청할 수도 있습니다.</li>
            <li>개인정보 조회, 수정을 위해서는 '개인정보변경'(또는 '회원정보수정' 등)을, 가입 해지를 위해서는 '회원 탈퇴'를 클릭하여 본인 확인 절차를 거치신 후 직접 열람, 정정 또는 탈퇴가 가능합니다.</li>
            <li>혹은 개인정보 보호책임자에게 서면, 전화 또는 이메일로 연락하시면 지체 없이 조치하겠습니다.</li>
        </ol>

        <h4>제9조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h4>
        <p>회사는 이용자에게 특화된 맞춤 서비스를 제공하기 위해서 이용자들의 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 운용합니다. 쿠키란 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에 보내는 아주 작은 텍스트 파일로서 이용자의 컴퓨터 하드디스크에 저장됩니다.</p>
        <ol>
            <li><strong>쿠키의 사용 목적:</strong> [예: 접속 빈도나 방문 시간 등을 분석, 이용자의 취향과 관심분야를 파악 및 자취 추적, 각종 이벤트 참여 정도 및 방문 횟수 파악]</li>
            <li><strong>쿠키의 설치·운영 및 거부:</strong> 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서, 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다. (설정 방법 예: 인터넷 익스플로러의 경우 > 웹 브라우저 상단의 도구 > 인터넷 옵션 > 개인정보)</li>
        </ol>

        <h4>제10조 (개인정보 보호책임자)</h4>
        <p>회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련 부서 및 개인정보 보호책임자를 지정하고 있습니다.</p>
        <ul>
            <li>개인정보 보호책임자: [prinCpal]</li>
            <li>소속/직위: [지정민, 최지현, 박지유, 김주은/ 팀원]</li>
            <li>이메일: [123@123.123]</li>
        </ul>
        <p>이용자는 회사의 서비스를 이용하며 발생하는 모든 개인정보보호 관련 민원을 개인정보 보호책임자 혹은 담당 부서로 신고할 수 있습니다.</p>

        <h4>제11조 (고지의 의무)</h4>
        <p>현 개인정보처리방침 내용 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일 전부터 서비스 내 '공지사항'을 통해 고지할 것입니다.</p>
        <ul>
            <li>공고일자: [2025년 12월 01일]</li>
            <li>시행일자: [2025년 12월 01일]</li>
        </ul>
    `,
    terms: `
      <h4>제1조 (목적)</h4>
        <p>본 약관은 prinCpal(이하 "회사"라 합니다)이 제공하는 "토닥토닥이" 및 관련 제반 서비스(이하 "서비스"라 합니다)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

        <h4>제2조 (용어의 정의)</h4>
        <ol>
            <li>"서비스"라 함은 구현되는 단말기(PC, 모바일, 태블릿 PC 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 "토닥토닥이" 및 관련 제반 서비스를 의미합니다.</li>
            <li>"회원"이라 함은 "서비스"에 접속하여 본 약관에 따라 "회사"와 이용계약을 체결하고 "회사"가 제공하는 "서비스"를 이용하는 고객을 말합니다.</li>
            <li>"아이디(ID)"라 함은 "회원"의 식별과 "서비스" 이용을 위하여 "회원"이 정하고 "회사"가 승인하는 문자 또는 숫자의 조합(또는 이메일 주소)을 의미합니다.</li>
            <li>"비밀번호"라 함은 "회원"이 부여받은 "아이디"와 일치되는 "회원"임을 확인하고 비밀보호를 위해 "회원" 자신이 정한 문자 또는 숫자의 조합을 의미합니다.</li>
            <li>"게시물"이라 함은 "회원"이 "서비스" 상에 게시한 부호·문자·음성·화상·동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일과 링크 등을 의미합니다.</li>
        </ol>

        <h4>제3조 (약관의 게시와 개정)</h4>
        <ol>
            <li>"회사"는 본 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면 또는 연결 화면에 게시합니다.</li>
            <li>"회사"는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련법을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
            <li>"회사"가 약관을 개정할 경우에는 적용일자 및 개정 사유를 명시하여 현행약관과 함께 제1항의 방식에 따라 그 개정약관의 적용일자 7일 전부터 적용일자 전일까지 공지합니다. 다만, 회원에게 불리한 약관의 개정의 경우에는 30일 전부터 공지합니다.</li>
            <li>"회원"은 개정된 약관에 동의하지 않을 경우 "회원" 탈퇴를 할 수 있습니다.</li>
        </ol>

        <h4>제4조 (이용계약 체결)</h4>
        <ol>
            <li>이용계약은 "회원"이 되고자 하는 자(이하 "가입신청자")가 약관의 내용에 대하여 동의를 한 다음 회원가입신청을 하고 "회사"가 이러한 신청에 대하여 승낙함으로써 체결됩니다.</li>
            <li>"회사"는 "가입신청자"의 신청에 대하여 "서비스" 이용을 승낙함을 원칙으로 합니다. 다만, "회사"는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
                <ul>
                    <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                    <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
                    <li>허위의 정보를 기재하거나, "회사"가 제시하는 내용을 기재하지 않은 경우</li>
                    <li>기타 "회사"가 정한 이용신청 요건이 미비되었을 때</li>
                </ul>
            </li>
        </ol>

        <h4>제5조 (회원정보의 변경)</h4>
        <ol>
            <li>"회원"은 개인정보관리화면을 통하여 언제든지 본인의 개인정보를 열람하고 수정할 수 있습니다.</li>
            <li>"회원"은 회원가입신청 시 기재한 사항이 변경되었을 경우 온라인으로 수정을 하거나 전자우편 기타 방법으로 "회사"에 대하여 그 변경사항을 알려야 합니다.</li>
            <li>제2항의 변경사항을 "회사"에 알리지 않아 발생한 불이익에 대하여 "회사"는 책임지지 않습니다.</li>
        </ol>

        <h4>제6조 (회사의 의무)</h4>
        <ol>
            <li>"회사"는 관련법과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 "서비스"를 제공하기 위하여 최선을 다하여 노력합니다.</li>
            <li>"회사"는 "회원"이 안전하게 "서비스"를 이용할 수 있도록 개인정보(신용정보 포함)보호를 위해 보안 시스템을 갖추어야 하며 개인정보처리방침을 공시하고 준수합니다.</li>
        </ol>

        <h4>제7조 (회원의 의무)</h4>
        <ol>
            <li>"회원"은 다음 행위를 하여서는 안 됩니다.
                <ul>
                    <li>신청 또는 변경 시 허위 내용의 등록</li>
                    <li>타인의 정보 도용</li>
                    <li>"회사"가 게시한 정보의 변경</li>
                    <li>"회사"와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                    <li>"회사" 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                    <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 "서비스"에 공개 또는 게시하는 행위</li>
                    <li>"회사"의 동의 없이 영리를 목적으로 "서비스"를 사용하는 행위</li>
                    <li>기타 불법적이거나 부당한 행위</li>
                </ul>
            </li>
        </ol>

        <h4>제8조 (서비스의 제공, 변경 및 중단)</h4>
        <ol>
            <li>"회사"는 "서비스"를 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
            <li>"회사"는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 "서비스"의 제공을 일시적으로 중단할 수 있습니다.</li>
            <li>"회사"는 "서비스"의 수정, 변경이 필요한 경우, "서비스"의 전부 또는 일부를 변경할 수 있습니다. 이 경우 "회사"는 회원에게 공지합니다.</li>
        </ol>

        <h4>제9조 (서비스 이용제한 및 계약 해지)</h4>
        <ol>
            <li>"회사"는 "회원"이 본 약관의 의무를 위반하거나 "서비스"의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 "서비스" 이용을 단계적으로 제한할 수 있습니다.</li>
            <li>"회원"은 언제든지 "회사"에 이용계약 해지 의사를 통지함으로써 이용계약을 해지(회원 탈퇴)할 수 있습니다.</li>
        </ol>

        <h4>제10조 (게시물의 저작권 및 관리)</h4>
        <ol>
            <li>"회원"이 "서비스" 내에 게시한 "게시물"의 저작권은 해당 "게시물"의 저작자에게 귀속됩니다.</li>
            <li>"회원"이 "서비스" 내에 게시하는 "게시물"은 "서비스" 및 관련 프로모션 등에 노출될 수 있으며, 해당 노출을 위해 필요한 범위 내에서는 일부 수정, 복제, 편집되어 게시될 수 있습니다. 이 경우, "회사"는 저작권법 규정을 준수하며, "회원"은 언제든지 고객센터 또는 "서비스" 내 관리 기능을 통해 해당 "게시물"에 대해 삭제, 비공개 등의 조치를 취할 수 있습니다.</li>
            <li>"회원"의 "게시물"이 "정보통신망법" 및 "저작권법"등 관련법에 위반되는 내용을 포함하는 경우, 권리자는 관련법이 정한 절차에 따라 해당 "게시물"의 게시중단 및 삭제 등을 요청할 수 있으며, "회사"는 관련법에 따라 조치를 취하여야 합니다.</li>
        </ol>

        <h4>제11조 (책임제한)</h4>
        <ol>
            <li>"회사"는 천재지변 또는 이에 준하는 불가항력으로 인하여 "서비스"를 제공할 수 없는 경우에는 "서비스" 제공에 관한 책임이 면제됩니다.</li>
            <li>"회사"는 "회원"의 귀책사유로 인한 "서비스" 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
            <li>"회사"는 "회원"이 "서비스"와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
        </ol>

        <h4>제12조 (준거법 및 재판관할)</h4>
        <ol>
            <li>"회사"와 "회원" 간에 제기된 소송은 대한민국법을 준거법으로 합니다.</li>
            <li>"회사"와 "회원" 간 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원([예: 서울중앙지방법원])에 제소함을 원칙으로 합니다.</li>
        </ol>
        <p><strong>[부칙]</strong></p>
        <pstyle="margin-top:10px;color:var(--ink-muted)">시행일: 2025-01-01</p>
    `
  };

  // 4) 어디에서 클릭해도 동작하도록(인페이지/사이드/미삽입 모두 커버)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-action]');
    if(!btn) return;

    const action = btn.getAttribute('data-action');
    if(action === 'open-privacy'){
      openDocModal('개인정보처리방침', TEMPLATES.privacy);
    } else if(action === 'open-terms'){
      openDocModal('이용약관', TEMPLATES.terms);
    } else if(action === 'open-modal'){
      // 기존 버튼(data-action="open-modal")도 지원 → 선택 모달로 열기
      openDocModal('문서 보기', `
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" data-action="open-privacy">개인정보처리방침</button>
          <button class="btn" data-action="open-terms">이용약관</button>
        </div>
        <p class="modal-hint" style="margin-top:10px;color:var(--ink-muted)">원하는 문서를 선택하세요.</p>
      `);
    }
  });

  // 5) 사이즈 CSS가 없다면 최소치만 주입(중복 삽입 안전)
  if(!document.getElementById('doc-modal-min-css')){
    const style = document.createElement('style');
    style.id = 'doc-modal-min-css';
    style.textContent = `
      .modal-card--lg{ width:min(96vw, 820px); max-height:86vh; display:flex; flex-direction:column; }
      .modal.hidden{ display:none }
      .modal{ position:fixed; inset:0; z-index:9998; display:grid; place-items:center; }
      .modal-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.28); backdrop-filter:saturate(140%) blur(2px); }
      .modal-card{ position:relative; z-index:1; background:#fff; border:1px solid var(--line); border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,.12); }
    `;
    document.head.appendChild(style);
  }
})();
