export function renderInformation(root, navigate) {
  root.innerHTML = `
    <section class="information">
      <h2>👤 정보 허브 페이지</h2>
      <button id="goHome">🏠 홈으로</button>
    </section>
  `;

  document.querySelector('#goHome').addEventListener('click', () => navigate('/'));
}
