export function renderMyPage(root, navigate) {
  root.innerHTML = `
    <section class="mypage">
      <h2>👤 마이페이지</h2>
      <p>상담 기록과 감정 패턴을 확인하세요.</p>
      <button id="goHome">🏠 홈으로</button>
    </section>
  `;

  document.querySelector('#goHome').addEventListener('click', () => navigate('/'));
}
