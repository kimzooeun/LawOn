export function renderHeader(root, navigate) {
  root.innerHTML = `
    <nav class="navbar">
      <a href="/" id="homeLink" class="logo">💚 감성상담</a>
      <div class="nav-links">
        <button id="chatNav">상담</button>
        <button id="mypageNav">마이</button>
        <button id="expertNav">전문가 연계</button>
        <button id="communityNav">커뮤니티
        <button id="informationNav">법률정보</button></button>
      </div>
    </nav>
  `;

  document.querySelector('#homeLink').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/');
  });

  document.querySelector('#chatNav').addEventListener('click', () => navigate('/chat'));
  document.querySelector('#mypageNav').addEventListener('click', () => navigate('/mypage'));
  document.querySelector('#expertNav').addEventListener('click', () => navigate('/expert'));
  document.querySelector('#communityNav').addEventListener('click', () => navigate('/community'));
  document.querySelector('#informationNav').addEventListener('click', () => navigate('/information'));
}
