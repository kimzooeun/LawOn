// 3. Whisper STT
// (음성 녹음, 서버 전송, 텍스트 변환)

import { showToast, STT_ENDPOINT } from "./utils.js";

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

    mediaRecorder.onstop = async () => {
      try {
        if (!audioChunks.length) {
          showToast("🎤 녹음된 데이터가 없습니다", "info");
          return;
        }

        const mime = chosenMime || "audio/webm";
        const ext = mime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(audioChunks, { type: mime });

        const fd = new FormData();
        fd.append("audio_file", blob, `speech.webm`);

        showToast("🎧 음성 인식 중...", "info", 3000);

        const res = await fetch(STT_ENDPOINT, { method: "POST", body: fd });
        if (!res.ok) throw new Error("STT HTTP " + res.status);

        const json = await res.json();
        const text = (json.text || json.transcription || "").trim();

        if (text) {
          targetInputEl.value = text;
          showToast("✅ 인식 완료", "success");
          if (autoSubmitAfterSTT) {
            targetInputEl.closest("form")?.requestSubmit();
          }
        } else {
          showToast("⚠ 음성 인식 불가, 좀 더 정확하게 부탁드려요!", "info");
        }
      } catch (err) {
        console.error("STT 처리 오류:", err);
        showToast("❌ Whisper 서버 응답 오류", "info", 3000);
      } finally {
        cleanupRecording();
      }
    };

    mediaRecorder.start();
    activeMicBtn?.classList.add("recording");
    activeMicBtn.textContent = "⏺";
    activeMicBtn.title = "녹음 중지";
    showToast("🎙 녹음 시작", "info", 1200);
  } catch (err) {
    console.error("마이크 초기화 오류:", err);
    showToast("⚠ 마이크 접근 실패 (권한/장치 확인)", "info", 3000);
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
    activeMicBtn.textContent = "🎙";
    activeMicBtn.title = "음성 입력";
  }
  activeMicBtn = null;
  targetInputEl = null;
  autoSubmitAfterSTT = false;

  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
}

export function bindMic(micBtnEl, inputEl, autoSubmit = false) {
  if (!micBtnEl || !inputEl) return;
  micBtnEl.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      activeMicBtn = micBtnEl;
      targetInputEl = inputEl;
      autoSubmitAfterSTT = !!autoSubmit;
      startRecording();
    }
  });
}
