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

async function initMicStream() {
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

// -----------------------------
// 녹음 시작
// -----------------------------
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
              "Content-Type": mime
            }
          });
     

        if (!uploadRes.ok) {
          throw new Error(`S3 업로드 실패: HTTP ${uploadRes.status}`);
        }

        // 3) S3 실제 URL 
        console.log("📄 실제 S3 URL =", fileKey);
        showToast("🧠 Whisper 처리 중...", "info", 3000);

        // 4) recognize 호출 → Spring → FastAPI → Whisper
        const recognizeRes = await fetch("/api/stt/recognize", {
          method: "POST",
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
    showToast("🎙 녹음 시작", "info", 1200);
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
  }
  activeMicBtn = null;
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
