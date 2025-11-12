// ===================================
// 5. 마이페이지
// (탐색형 마이페이지 전환, 검색/필터, 액션)
// ===================================

// === 탐색형 마이페이지 전환 & 검색/필터 ===
function initMypageListeners() {
  const exploreBtn = document.getElementById("exploreBtn");
  const explore = document.getElementById("mypageExplore");

  if (!exploreBtn || !explore) return;

  // 버튼 라벨 -> '마이페이지'
  const txt = exploreBtn.querySelector(".nav-text");
  if (txt) txt.textContent = "마이페이지";

  // 액션: 프로젝트 로컬 키
  const NICK_KEY = "todak_nickname";
  const PUSH_KEY = "todak_push_enabled";
  const RECENTS_KEY = "todak_recents";
  const CHATS_KEY = "todak_chats_v1";

  function updatePushStatusText() {
    const btn = document.querySelector(
      '.mpx-list-item[data-action="toggle-push"]'
    );
    if (!btn) return;
    const p = btn.querySelector(".mpx-item-text p");
    if (!p) return;

    const on = localStorage.getItem(PUSH_KEY) === "1";
    p.textContent = `상태 변경/결과 알림을 수신합니다. (현재: ${
      on ? "ON" : "OFF"
    })`;
  }

  // 페이지 로드 시 현재 알림 설정 상태를 텍스트에 반영
  updatePushStatusText();

  // 카드 액션 핸들러
  explore.addEventListener("click", async (e) => {
    const btn = e.target.closest(".mpx-list-item");
    if (!btn) return;
    const action = btn.dataset.action;

    // 공통 확인창
    const ask = (msg) => {
      return new Promise((resolve) => {
        Modal.open({
          message: msg,
          okText: "확인",
          cancelText: "취소",
          onConfirm: () => resolve(true),
        });
      });
    };

    if (action === "open-profile") {
      const currentNick = localStorage.getItem(NICK_KEY) || "";
      FormModal.open({
        title: "닉네임 변경",
        okText: "저장",
        formHtml: `
          <div class="form-group">
            <input type="text" id="nickname" name="nickname" class="input"
              value="" placeholder="${currentNick}">
          </div>
        `,
        onConfirm: (data) => {
          const newNick = (data.nickname || "").trim();
          if (newNick) {
            localStorage.setItem(NICK_KEY, newNick);
            if (typeof updateNicknameDisplay === "function") {
              updateNicknameDisplay(); // 헤더, 마이페이지, 빈 채팅방 닉네임 동시 업데이트
            }
            showToast("닉네임 저장 완료", "success");
          } else {
            showToast("닉네임을 입력해주세요.", "error");
            return false;
          }
        },
      });
    } else if (action === "open-security") {
      FormModal.open({
        title: "비밀번호 변경",
        okText: "변경",
        formHtml: `
          <div class="form-group">
            <label for="currentPassword">현재 비밀번호</label>
            <input type="password" id="currentPassword" name="currentPassword" class="input">
          </div>
          <div class="form-group">
            <label for="newPassword">새 비밀번호</label>
            <input type="password" id="newPassword" name="newPassword" class="input">
          </div>
          <div class="form-group">
            <label for="confirmPassword">새 비밀번호 (확인)</label>
            <input type="password" id="confirmPassword" name="confirmPassword" class="input">
          </div>
        `,
        onConfirm: (data) => {
          const { currentPassword, newPassword, confirmPassword } = data;

          if (!currentPassword || !newPassword || !confirmPassword) {
            showToast("모든 항목을 입력해주세요.", "error");
            return false;
          }

          if (newPassword !== confirmPassword) {
            showToast("새 비밀번호가 일치하지 않습니다.", "error");
            return false;
          }

          // --- (경고) 실제 서버 API 호출 필요 ---
          console.log("서버 전송 시도:", data);
          showToast("비밀번호 변경 완료", "success");
        },
      });
    } else if (action === "open-report") {
      if (typeof openDocModal === "function") {
        let reportContent = "";

        // (utils.js에서 로드되고 chat.js에서 관리되는) 전역 state.recents를 확인합니다.
        if (!state.recents || state.recents.length === 0) {
          // 채팅 내역이 없을 경우
          reportContent =
            '<p style="text-align: center; padding: 20px;">최근 상담 내역이 없습니다.</p>';
        } else {
          // state.recents 배열을 기반으로 목록 생성
          const itemsHtml = state.recents
            .map((r) => {
              // r.updatedAt으로 날짜 포맷팅
              const dateStr = new Date(r.updatedAt).toLocaleString();
              // r.title로 채팅 제목 표시
              return `
              <li class="report-item">
                <span>
                  <strong>${r.title}</strong>
                  <span style="font-size: 0.9em; color: var(--ink-muted); margin-top: 4px; display: block;">
                    ${dateStr}
                  </span>
                </span>
              </li>`;
            })
            .join("");

          reportContent = `<ul class="report-list">${itemsHtml}</ul>`;
        }

        // 모달 제목은 "상담 내역"을 유지하고, 동적으로 생성된 콘텐츠를 표시
        openDocModal("상담 내역", reportContent, "lg");
      } else {
        alert("상담 내역 (모달 로드 실패)");
      }
    } else if (action === "toggle-push") {
      const on = localStorage.getItem(PUSH_KEY) === "1";
      localStorage.setItem(PUSH_KEY, on ? "0" : "1");
      showToast(on ? "알림 OFF" : "알림 ON", "info");
      updatePushStatusText();
    } else if (action === "clear-chats") {
      Modal.open({
        message: "⚠ 삭제 시 되돌릴 수 없습니다. 전체 삭제할까요?",
        okText: "삭제",
        onConfirm: () => {
          // 1. 로컬 스토리지 삭제
          localStorage.removeItem(STORE_KEY);

          // 2. 메모리에 있는 전역 state 변수 초기화
          Object.assign(state, createEmptyStore());

          // 3. 새 채팅 세션 생성
          createNewSession();

          // 4. 토스트 표시 (새로고침 제거)
          showToast("대화 전체 비우기 완료", "success");
        },
      });
    } else if (action === "wipe-local") {
      Modal.open({
        message: "로컬 저장소 사용자 데이터를 초기화할까요?",
        okText: "초기화",
        onConfirm: () => {
          localStorage.removeItem(NICK_KEY);
          localStorage.removeItem(PUSH_KEY);
          localStorage.removeItem(RECENTS_KEY);
          localStorage.removeItem(CHATS_KEY);
          if (typeof updateNicknameDisplay === "function") {
            updateNicknameDisplay();
          }
          showToast("로컬 데이터 초기화 완료", "success");
          setTimeout(() => location.reload(), 1000); // 새로고침
        },
      });
    } else if (action === "open-withdrawal") {
      Modal.open({
        title: "회원 탈퇴",
        message:
          "정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.",
        okText: "탈퇴", // 버튼 텍스트
        onConfirm: () => {
          // (데모) 토스트 메시지만 표시
          showToast("회원 탈퇴가 처리되었습니다.", "info");

          // (예시) 1초 후 페이지 새로고침 (로그아웃 효과)
          setTimeout(() => {
            location.reload();
          }, 1000);
        },
      });
    } else if (action === "open-emergency") {
      if (typeof openDocModal === "function") {
        const emergencyContent = `
          <ul class="emergency-list">
            <li class="emergency-item">
              <strong class="emergency-number">112</strong>
              <span class="emergency-desc">경찰/여성폭력</span>
            </li>
            <li class="emergency-item">
              <strong class="emergency-number">119</strong>
              <span class="emergency-desc">화재/구급</span>
            </li>
            <li class="emergency-item">
              <strong class="emergency-number">1393</strong>
              <span class="emergency-desc">자살예방상담</span>
            </li>
            <li class="emergency-item">
              <strong class="emergency-number">1577-0199</strong>
              <span class="emergency-desc">여성긴급전화</span>
            </li>
          </ul>
        `;
        openDocModal("긴급 연락", emergencyContent, "default");
      } else {
        alert("긴급 연락 (모달 로드 실패)");
      }
    }
  });
}
