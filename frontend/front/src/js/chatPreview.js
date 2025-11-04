// chatPreview.js  자동 대화 미리보기 반복 애니메이션
(function(){
  const wrap = document.getElementById('cpMessages');
  const typing = document.getElementById('cpTyping');
  if(!wrap) return;

 const script = [
    {role:'bot',  text:'안녕하세요! 무엇을 도와드릴까요? 😊'},
    {role:'user', text:'양육비 조정 가능한가요?'},
    {role:'bot',  text:'사정변경이 있으면 법원에서 조정 가능성이 있어요.\n간단히 상황을 알려주시면 가이드 드릴게요.'},
    {role:'user', text:'최근 실직했고 소득이 절반 이하로 줄었어요.'},
    {role:'bot',  text:'최근 소득 변동 자료와 기존 합의 내역이 있으면 좋아요.\n“간편 상담”으로 이어가 보실래요?'}
  ];

  let idx=0;
  const delay = ms => new Promise(r=>setTimeout(r,ms));
  const showTyping = on => typing.style.opacity = on?'1':'0';
  const addBubble = ({role,text})=>{
    const b=document.createElement('div');
    b.className='cp-bubble '+role;
    b.textContent=text;
    wrap.appendChild(b);
    wrap.scrollTo({top:wrap.scrollHeight,behavior:'smooth'});
  };
  const clearBubbles=()=>wrap.innerHTML='';

  async function play(){
    clearBubbles(); idx=0;
    while(idx<script.length){
      const line=script[idx++];
      if(line.role==='bot'){ showTyping(true); await delay(600); showTyping(false); }
      addBubble(line);
      await delay(2000);
    }
    await delay(1000);
    play();
  }

  const target = document.querySelector('.cp-chat-preview');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) play(); });
  }, {threshold:0.3});
  if(target) io.observe(target);
})();
