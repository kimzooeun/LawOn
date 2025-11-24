import { TokenManager } from '/src/js/token.js';

const SETTINGS_API_BASE = "/admin/settings";

// DOM READY
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initPasswordChange();
  initNotifySettings();
  initSystemButtons();
});

// 탭 버튼

function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      tabPanels.forEach((panel) => {
        panel.style.display = panel.id === tab ? "block" : "none";
      });
    });
  });

  tabBtns[0]?.click();
}

// 비밀번호 변경 기능 (수정됨)

function initPasswordChange() {
  const btn = document.getElementById("pwChangeBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const currentPw = document.getElementById("currentPw").value.trim();
    const newPw = document.getElementById("newPw").value.trim();

    if (!currentPw || !newPw) {
      return showToast("모든 비밀번호 입력칸을 채워주세요.");
    }

    const token = TokenManager.getAccessToken();
    if (!token) return showToast("인증 오류: 다시 로그인하세요.");

    try {
      const res = await fetch(`/api/admin/change-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });

      const message = await res.text();

      if (!res.ok) {
        // 에러 메시지가 있으면 띄워줌 (예: "현재 비밀번호가 일치하지 않습니다.")
        return showToast(message || "비밀번호 변경 실패");
      }

      showToast("비밀번호 변경 완료! 다시 로그인 해주세요.");
      
      // 2초 뒤 로그아웃 및 로그인 페이지로 이동
      setTimeout(() => {
          TokenManager.clearTokens();
          window.location.href = "/admin/login/";
      }, 2000);

    } catch (err) {
      console.error(err);
      showToast("서버 오류 발생");
    }
  });
}

// 알림 설정

function initNotifySettings() {
  document.querySelectorAll("#notify input[type='checkbox']").forEach((chk) => {
    chk.addEventListener("change", async (e) => {
      const label = e.target.parentElement.textContent.trim();

      const key = label.includes("시스템 오류")
        ? "NOTIFY_ERROR"
        : label.includes("이메일")
        ? "NOTIFY_EMAIL"
        : "AUTO_BACKUP";

      await updateSetting(key, e.target.checked.toString());
      showToast(
        `${label}이(가) ${e.target.checked ? "활성화" : "비활성화"}되었습니다.`
      );
    });
  });
}

// 시스템 버튼
function initSystemButtons() {
  const backupBtn = document.getElementById("backupBtn");
  const resetBtn = document.getElementById("resetBtn");

  backupBtn?.addEventListener("click", async () => {
    await updateSetting("LAST_BACKUP", new Date().toISOString());
    showToast("데이터 백업 완료 💾");
  });

  resetBtn?.addEventListener("click", async () => {
    if (!confirm("⚠️ 초기화하시겠습니까?")) return;

    try {
      await fetch(`${SETTINGS_API_BASE}/RESET_ALL`, { method: "DELETE" });
      showToast("전체 초기화 완료 🔄");
    } catch (err) {
      showToast("초기화 실패");
    }
  });
}

// 서버 Key-Value 설정 저장
async function updateSetting(key, value) {
  try {
    const res = await fetch(
      `${SETTINGS_API_BASE}/${key}?value=${encodeURIComponent(value)}`,
      { method: "POST" }
    );

    if (!res.ok) throw new Error("설정 저장 실패");
  } catch (err) {
    console.error(err);
    showToast("⚠️ 서버 오류");
  }
}

// 토스트 메시지
function showToast(msg) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.className = "show";

  setTimeout(() => (toast.className = toast.className.replace("show", "")), 2000);
}