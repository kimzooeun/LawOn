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

  // const backendUrl = import.meta.env.VITE_API_BASE_URL;
  // const fastapiUrl = import.meta.env.VITE_FASTAPI_URL;

  // console.log("Backend:", backendUrl);
  // console.log("FastAPI:", fastapiUrl);
}
