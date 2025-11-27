// Whisper STT
// (음성 녹음, 서버 전송, 텍스트 변환)

import { showToast} from "./utils.js";

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


async function sendSTT(audioBlob) {
  const fileName = "audio_" + Date.now() + ".webm";
  const contentType = audioBlob.type || "audio/webm";

  // 1) presign 요청
  const presignRes = await fetch(`/api/stt/presign?fileName=${fileName}&contentType=${contentType}`);
  const { uploadUrl, fileKey } = await presignRes.json();

  // 2) S3 업로드
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: audioBlob
  });

  // 3) STT 실행 요청
  const sttRes = await fetch("/api/stt/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileKey })
  });

  const data = await sttRes.json();
  return data.text;
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
        const blob = new Blob(audioChunks, { type: mime });

        const fileName = `speech_${Date.now()}.webm`;
        
        showToast("🎧 음성 인식 중...", "info", 3000);

       // 1) presigned URL 요청 (/api/stt/presign)
        const presignRes = await fetch(
          `/api/stt/presign?fileName=${encodeURIComponent(
            fileName
          )}&contentType=${encodeURIComponent(mime)}`
        );

        if (!presignRes.ok) {
          throw new Error(`Presign HTTP ${presignRes.status}`);
        }

        const { uploadUrl, fileKey } = await presignRes.json();

        // 2) S3에 오디오 업로드 (직접 업로드, CloudFront 안 거침)
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": mime,
          },
          body: blob,
        });

        if (!uploadRes.ok) {
          throw new Error(`S3 업로드 실패: HTTP ${uploadRes.status}`);
        }

        // 3) STT 요청 (/api/stt/recognize)
        const sttRes = await fetch("/api/stt/recognize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileKey }),
        });

        if (!sttRes.ok) {
          let errorText = `STT HTTP ${sttRes.status}`;
          try {
            const errJson = await sttRes.json();
            if (errJson.error) errorText = errJson.error;
          } catch (e) {
            // 무시, 기본 메시지 사용
          }
          throw new Error(errorText);
        }

        const json = await sttRes.json();
        const text = (json.text || json.transcription || "").trim();

        if (text) {
          targetInputEl.value = text;
          showToast("✅ 인식 완료", "success");
          if (autoSubmitAfterSTT) {
            targetInputEl.closest("form")?.requestSubmit();
          }
        } else if (json.error) {
          showToast(`❌ STT 서버 오류: ${json.error}`, "error", 5000);
        } else {
          showToast("⚠ 음성 인식 불가, 좀 더 정확하게 부탁드려요!", "info");
        }
      } catch (err) {
        console.error("STT 처리 오류:", err);
        const displayMsg = err.message?.startsWith("STT HTTP") || err.message?.startsWith("Presign HTTP")
          ? err.message
          : "Whisper 서버 응답 오류";
        showToast(`❌ ${displayMsg}`, "error", 5000);
      } finally {
        cleanupRecording();
      }
    };


    mediaRecorder.start();
    activeMicBtn?.classList.add("recording");
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
