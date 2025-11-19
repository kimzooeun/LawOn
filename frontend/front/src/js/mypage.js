// ===================================
// 5. 마이페이지
// (탐색형 마이페이지 전환, 검색/필터, 액션)
// ===================================

import {
  Modal,
  FormModal,
  showToast,
  updateNicknameDisplay,
  state,
  createEmptyStore,
} from "./utils.js";

import {
  updateNickname,
  updatePassword,
  clearAllSessions,
  deleteUser,
} from "./api.js";

import { createNewSession } from "./chat.js";
import { openDocModal } from "./init.js";

// === 탐색형 마이페이지 전환 & 검색/필터 ===
export function initMypageListeners() {
  const exploreBtn = document.getElementById("exploreBtn");
  const explore = document.getElementById("mypageExplore");

  if (!exploreBtn || !explore) return;

  // 버튼 라벨 -> '마이페이지'
  const txt = exploreBtn.querySelector(".nav-text");
  if (txt) txt.textContent = "마이페이지";

  // 액션: 프로젝트 로컬 키
  const USER_ID_KEY = "todak_user_id";
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

  /*비밀번호 유효성 검사
   * @param {string} password
   * @param {string} nickname
   * @returns {string | null} 에러 메시지 또는 null (성공)
   */
  function validatePasswordJS(password, nickname) {
    if (!password) {
      return "비밀번호를 입력해주세요.";
    }
    if (password.length < 8) {
      return "비밀번호는 최소 8자 이상이어야 합니다.";
    }
    // 정책: 영문 대/소문자, 숫자 조합
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      return "비밀번호는 영문 대문자, 소문자, 숫자를 모두 포함해야 합니다.";
    }
    if (nickname && password.includes(nickname)) {
      return "비밀번호에 닉네임을 포함할 수 없습니다.";
    }
    return null; // 통과
  }
  /*닉네임 유효성 검사*/
  function validateNicknameJS(nickname) {
    if (!nickname || nickname.trim().length === 0) {
      return "닉네임은 필수입니다.";
    }
    // 서버 MemberService의 정규식과 동일하게 설정
    const regex = /^[가-힣a-zA-Z0-9_]{2,15}$/;
    if (!regex.test(nickname)) {
      return "닉네임은 2~15자의 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.";
    }
    return null; // 통과
  }
  // 카드 액션 핸들러
  explore.addEventListener("click", async (e) => {
    const btn = e.target.closest(".mpx-list-item");
    if (!btn) return;
    const action = btn.dataset.action;

    const currentUserId = localStorage.getItem(USER_ID_KEY);

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
        onConfirm: async (data) => {
          const newNick = (data.nickname || "").trim();

          const validationError = validateNicknameJS(newNick);
          if (validationError) {
            showToast(validationError, "error");
            return false; // 오류 시 모달 닫지 않음
          }
          try {
            // 2. ID가 있는지 확인 (로그인이 안됐거나 세션이 만료된 경우)
            if (!currentUserId) {
              showToast(
                "사용자 정보가 없습니다. 다시 로그인해주세요.",
                "error"
              );
              return false; // ID가 없으면 함수를 중단합니다.
            }

            // 3. [수정] 동적으로 가져온 ID로 API 함수 호출
            await updateNickname(currentUserId, newNick);

            // 닉네임 변경 성공 시 로직
            localStorage.setItem(NICK_KEY, newNick);
            if (typeof updateNicknameDisplay === "function") {
              updateNicknameDisplay();
            }
            showToast("닉네임 저장 완료", "success");
          } catch (error) {
            // 서버에서 보낸 오류 메시지(예: 욕설, 동일 닉네임 등) 표시
            const errorMsg =
              error.response?.data?.message || // (MemberService가 보낸 메시지)
              "닉네임 변경에 실패했습니다.";
            showToast(errorMsg, "error");
            return false; // 모달 닫지 않음
          } // ... (이하 생략)
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
        onConfirm: async (data) => {
          const { currentPassword, newPassword, confirmPassword } = data;
          const currentNick = localStorage.getItem(NICK_KEY) || ""; // 닉네임 가져오기
          if (!currentPassword || !newPassword || !confirmPassword) {
            showToast("모든 항목을 입력해주세요.", "error");
            return false;
          }

          if (newPassword !== confirmPassword) {
            showToast("새 비밀번호가 일치하지 않습니다.", "error");
            return false;
          }

          if (currentPassword === newPassword) {
            showToast("새 비밀번호가 현재 비밀번호와 동일합니다.", "error");
            return false;
          }

          //프론트 유효성 검사
          const validationError = validatePasswordJS(newPassword, currentNick);
          if (validationError) {
            showToast(validationError, "error");
            return false;
          }

          try {
            if (!currentUserId) {
              showToast(
                "사용자 정보가 없습니다. 다시 로그인해주세요.",
                "error"
              );
              return false;
            }
            await updatePassword(currentUserId, currentPassword, newPassword);
            showToast("비밀번호 변경 완료", "success");
          } catch (error) {
            // [수정] 백엔드에서 보낸 유효성 검사 오류 메시지 표시
            const errorMsg =
              error.response?.data?.message ||
              "비밀번호 변경 실패 (현재 비밀번호 확인)";
            showToast(errorMsg, "error");
            return false; //
          }
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
        // onConfirm을 async 함수로 변경
        onConfirm: async () => {
          try {
            // 1. 서버에 전체 삭제 요청 (api.js 함수 호출)
            await clearAllSessions();

            // 2. (API 성공 시) 로컬 state 초기화
            Object.assign(state, createEmptyStore());

            // 3. 서버에 새 채팅 세션 생성 요청
            await createNewSession(); // (내부적으로 renderChat() 호출됨)

            // 4. 토스트 표시
            showToast("대화 전체 비우기 완료", "success");
          } catch (err) {
            console.error("대화 전체 삭제 실패:", err);
            showToast("대화 삭제에 실패했습니다.", "error");
          }
        },
      });
    } else if (action === "open-withdrawal") {
      Modal.open({
        title: "회원 탈퇴",
        message:
          "정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.",
        okText: "탈퇴", // 버튼 텍스트
        onConfirm: async () => {
          try {
            if (!currentUserId) {
              showToast(
                "사용자 정보가 없습니다. 다시 로그인해주세요.",
                "error"
              );
              return false;
            }

            await deleteUser(currentUserId);
            showToast("회원 탈퇴가 완료되었습니다.", "info");

            localStorage.removeItem(USER_ID_KEY);
            localStorage.removeItem(NICK_KEY);

            setTimeout(() => {
              location.reload();
            }, 1000);
          } catch (error) {
            showToast("회원 탈퇴 실패", "error");
          }
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
