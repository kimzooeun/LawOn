export function renderCommunity(root, navigate) {
  root.innerHTML = `
    <section class="community">
      <h2>👤 익명의 커뮤니티</h2>
      <p>얘기를 나눠보자.</p>
      <button id="goHome">🏠 홈으로</button>
    </section>
  `;

  document.querySelector('#goHome').addEventListener('click', () => navigate('/'));
}
