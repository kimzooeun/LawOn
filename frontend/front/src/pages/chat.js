export function renderChat(root, navigate) {
  root.innerHTML = `
    <div class="chat-container">
      <h2>🎧 AI 음성 상담 챗봇</h2>
      <div id="chat-box" class="chat-box"></div>
      <div class="controls">
        <button id="recordBtn">🎤 녹음하기</button>
        <button id="backBtn">🔙 홈으로</button>
      </div>
    </div>
  `;

  const recordBtn = document.querySelector('#recordBtn');
  const backBtn = document.querySelector('#backBtn');
  const chatBox = document.querySelector('#chat-box');

  let isRecording = false;
  let mediaRecorder;
  let chunks = [];

  // 메시지 추가 함수
  function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  recordBtn.addEventListener('click', async () => {
    try {
      addMessage("🎧 (샘플 음성 전송 중...)", "bot");
      recordBtn.disabled = true;

      // ✅ 미리 넣어둔 샘플 파일 (public/ 혹은 src/ 하위 경로에 divorce_test.mp3)
      const sampleFile = await fetch("/divorce_test.mp3");
      const blob = await sampleFile.blob();

      const formData = new FormData();
      formData.append("audio_file", blob, "divorce_test.mp3");

      // ✅ Whisper STT 호출
      const res = await fetch("http://127.0.0.1:8000/stt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      addMessage(data.text, "user");

      // ✅ 챗봇 더미 응답
      const botResponse = "네, 그 부분은 위자료 청구 가능성이 있습니다! 🙆‍♀️";
      addMessage(botResponse, "bot");

      // ✅ TTS 변환 요청
      const ttsForm = new FormData();
      ttsForm.append("text", botResponse);
      const ttsRes = await fetch("http://127.0.0.1:8000/tts", {
        method: "POST",
        body: ttsForm,
      });

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();

    } catch (err) {
      console.error("STT/TTS 처리 중 오류:", err);
      addMessage("⚠️ 서버 연결 오류가 발생했습니다.", "bot");
    } finally {
      recordBtn.disabled = false;
    }
  });

  // ✅ 실제 음성 녹음 테스트용 (비활성화 상태)
  /*
  recordBtn.onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      addMessage("🎧 (녹음 중...)", "bot");
      recordBtn.disabled = true;
      mediaRecorder.start();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        addMessage("전송 중...", "bot");

        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("audio_file", blob, "voice.webm");

        // ✅ Whisper STT 요청
        const res = await fetch("http://127.0.0.1:8000/stt", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        addMessage(data.text, "user");

        // ✅ 챗봇 응답
        const botResponse = "네, 그 부분은 위자료 청구 가능성이 있습니다.";
        addMessage(botResponse, "bot");

        // ✅ TTS 변환 요청
        const ttsForm = new FormData();
        ttsForm.append("text", botResponse);
        const ttsRes = await fetch("http://127.0.0.1:8000/tts", {
          method: "POST",
          body: ttsForm,
        });

        const audioBlob = await ttsRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        recordBtn.disabled = false;
      };

      setTimeout(() => {
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
      }, 4000); // 4초 녹음
    } catch (err) {
      console.error("🎤 마이크 접근 오류:", err);
      addMessage("⚠️ 마이크 권한을 허용해주세요.", "bot");
    }
  };
  */

  // 홈으로 돌아가기
  backBtn.addEventListener('click', () => navigate('/home'));
}