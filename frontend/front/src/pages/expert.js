export function renderExpert(root, navigate) {
  root.innerHTML = `
    <section class="expert">
      <h2>👤 전문가 연계 페이지</h2>
      <p>얘기를 나눠보자.</p>
      <button id="goHome">🏠 홈으로</button>
    </section>
  `;

  document.querySelector('#goHome').addEventListener('click', () => navigate('/'));
}
