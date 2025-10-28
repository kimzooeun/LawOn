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

