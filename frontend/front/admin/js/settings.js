// === 시스템 설정 (Key-Value 기반) ===
const API_BASE = "http://localhost:8080/admin/settings";

document.addEventListener("DOMContentLoaded", () => {
  // 🎨 테마 버튼 클릭
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const theme = btn.classList.contains("light")
        ? "light"
        : btn.classList.contains("dark")
        ? "dark"
        : btn.classList.contains("purple")
        ? "purple"
        : "reset";

      await updateSetting("THEME", theme === "reset" ? "light" : theme);
      showToast(`테마가 '${theme}'(으)로 변경되었습니다.`);
    });
  });

  // 🔔 알림 설정 체크박스 이벤트
  document.querySelectorAll("#notify input[type='checkbox']").forEach(chk => {
    chk.addEventListener("change", async (e) => {
      const label = e.target.parentElement.textContent.trim();
      const key = label.includes("시스템 오류") ? "NOTIFY_ERROR"
                : label.includes("이메일") ? "NOTIFY_EMAIL"
                : "AUTO_BACKUP";

      await updateSetting(key, e.target.checked.toString());
      showToast(`${label} 설정이 ${e.target.checked ? "활성화" : "비활성화"}되었습니다.`);
    });
  });

  // ⚙️ 시스템 관리 버튼 (백업 / 초기화)
  const backupBtn = document.getElementById("backupBtn");
  const resetBtn = document.getElementById("resetBtn");

  backupBtn?.addEventListener("click", async () => {
    await updateSetting("LAST_BACKUP", new Date().toISOString());
    showToast("데이터 백업 완료 ✅");
  });

  resetBtn?.addEventListener("click", async () => {
    if (confirm("⚠️ 정말 전체 초기화를 진행하시겠습니까?")) {
      await fetch(API_BASE + "/RESET_ALL", { method: "DELETE" });
      showToast("전체 설정 초기화 완료 🗑");
    }
  });
});

// ✅ 서버에 Key-Value 설정 저장 (POST)
async function updateSetting(key, value) {
  try {
    const res = await fetch(`${API_BASE}/${key}?value=${encodeURIComponent(value)}`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("설정 저장 실패");
  } catch (err) {
    console.error(err);
    showToast("⚠️ 서버 오류 발생");
  }
  
}

// ✅ 사용자 알림 토스트
function showToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = "show";
  setTimeout(() => (toast.className = toast.className.replace("show", "")), 2500);
}
