import { showToast } from "./utils.js";

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let chosenMime = null;
let activeMicBtn = null;
let targetInputEl = null;
let autoSubmitAfterSTT = false;
let micStream = null;

function pickSupportedMime() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
  ];
  for (const c of candidates) {
    if (MediaRecorder?.isTypeSupported?.(c)) return c;
  }
  return "";
}

// async function initMicStream() {
//   return await navigator.mediaDevices.getUserMedia({
//     audio: {
//       echoCancellation: false,
//       noiseSuppression: false,
//       autoGainControl: false,
//       channelCount: 1
//     }
//   });
// }

async function initMicStream() {
  // 고품질 STT를 위한 오디오 설정
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true, // 에코 제거
      noiseSuppression: true, // 소음 제거
      autoGainControl: true, // 자동 감도 조정
    },
  });
}

// 녹음 시작
async function startRecording() {
  try {
    if (isRecording) {
      stopRecording();
      return;
    }

    micStream = await initMicStream();
    chosenMime = pickSupportedMime();
    mediaRecorder = chosenMime
      ? new MediaRecorder(micStream, { mimeType: chosenMime })
      : new MediaRecorder(micStream);

    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    // -----------------------------
    // 녹음 STOP → STT 처리 시작
    // -----------------------------
    mediaRecorder.onstop = async () => {
      try {
        if (!audioChunks.length) {
          showToast("🎤 녹음된 데이터가 없습니다", "info");
          return;
        }

        const blob = new Blob(audioChunks, { type: chosenMime || "audio/webm" });
        const fileName = `speech_${Date.now()}.webm`;

        showToast("🎧 음성 업로드 준비 중...", "info");

        // 1) presign 요청
        const presignRes = await fetch(
          `/api/stt/presign?fileName=${fileName}&contentType=${encodeURIComponent(blob.type)}`
        );

        if (!presignRes.ok) {
          throw new Error(`Presign HTTP ${presignRes.status}`);
        }

        const { uploadUrl, fileKey } = await presignRes.json();

        // 2) S3 그 자체에 바로 업로드 (PUT)

        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: blob,
            headers: {
              "Content-Type": "audio/webm"
            }
          });

        if (!uploadRes.ok) {
          throw new Error(`S3 업로드 실패: HTTP ${uploadRes.status}`);
        }

        showToast("🧠 Whisper 처리 중...", "info", 3000);

        // 4) recognize 호출 → Spring → FastAPI → Whisper
        const recognizeRes = await fetch("/api/stt/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey }),
        });

        if (!recognizeRes.ok) {
          throw new Error(`STT HTTP ${recognizeRes.status}`);
        }

        const json = await recognizeRes.json();
        const text = (json.text || json.transcription || "").trim();

        if (text) {
          targetInputEl.value = text;
          showToast("✅ 음성 인식 성공!", "success");
          if (autoSubmitAfterSTT) targetInputEl.closest("form")?.requestSubmit();
        } else {
          showToast("⚠ 음성 인식 실패", "info");
        }
      } catch (err) {
        console.error("STT 오류:", err);
        showToast(`❌ STT 오류: ${err.message}`, "error", 5000);
      } finally {
        cleanupRecording();
      }
    };

    mediaRecorder.start();
    activeMicBtn?.classList.add("recording");
    activeMicBtn.textContent = "⏺";
    showToast("🔴 녹음 시작", "info", 1200);
  } catch (err) {
    console.error("마이크 오류:", err);
    showToast("⚠ 마이크 접근 실패", "info", 3000);
    cleanupRecording();
  }
}

function stopRecording() {
  if (isRecording && mediaRecorder?.state !== "inactive") {
    mediaRecorder.stop();
    showToast("🛑 녹음 중지", "info", 1200);
  }
}


function cleanupRecording() {
  isRecording = false;

  if (activeMicBtn) {
    activeMicBtn.classList.remove("recording");
    activeMicBtn.title = "음성 입력";

    // 버튼 내부 아이콘을 강제로 마이크 SVG로 되돌림
    activeMicBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"         stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `;
  }

  targetInputEl = null;
  autoSubmitAfterSTT = false;

  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
}


export function bindMic(btn, input, autoSubmit = false) {
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    if (isRecording) stopRecording();
    else {
      activeMicBtn = btn;
      targetInputEl = input;
      autoSubmitAfterSTT = autoSubmit;
      startRecording();
    }
  });
}
