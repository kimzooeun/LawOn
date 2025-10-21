import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { renderHome } from './pages/home.js';
import { renderChat } from './pages/chat.js';
import { renderMyPage } from './pages/mypage.js';
import { renderCommunity } from './pages/community.js';
import { renderInformation } from './pages/information.js';
import { renderExpert } from './pages/expert.js';

const app = document.querySelector('#app');
const header = document.querySelector('#header');
const footer = document.querySelector('#footer');

function navigate(path) {
  history.pushState({}, '', path);
  route();
}

function route() {
  const path = window.location.pathname;
  if (path === '/' || path === '/home') renderHome(app, navigate);
  else if (path === '/chat') renderChat(app, navigate);
  else if (path === '/mypage') renderMyPage(app, navigate);
  else if (path === '/information') renderInformation(app, navigate);
  else if (path === '/community')  renderCommunity(app, navigate);
  else if (path === '/expert')  renderExpert(app, navigate);
}

window.addEventListener('popstate', route);

// 초기 렌더
renderHeader(header, navigate);
renderFooter(footer);
route();



