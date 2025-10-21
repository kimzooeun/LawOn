export function renderHome(root, navigate) {
  root.innerHTML = `
    <section class="home">
      <h1>💚 AI 감성 상담 챗봇</h1>
      <p>당신의 감정을 이해하고 공감하는 AI 상담 파트너</p>
      <button id="startChat">상담 시작하기</button>
    </section>
  `;

  document.querySelector('#startChat').addEventListener('click', () => {
    navigate('/chat');
  });
}
