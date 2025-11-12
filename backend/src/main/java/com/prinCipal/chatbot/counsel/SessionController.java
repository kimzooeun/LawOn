package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.dto.ChatRequestDto;
import com.prinCipal.chatbot.dto.ChatResponseDto;
import com.prinCipal.chatbot.dto.SessionCreationRequestDto;
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SessionController {
    
    private final SessionService sessionService;
    private final MemberRepository memberRepository;

    /**
     * 1. 초기 데이터 로드 (GET /api/chats)
     */
    @GetMapping("/chats")
    public ResponseEntity<?> getInitialData() {
        Map<String, Object> initialData = new HashMap<>();
        initialData.put("recents", Collections.emptyList());
        initialData.put("sessions", Collections.emptyMap());
        initialData.put("currentId", null);
        
        return ResponseEntity.ok(initialData);
    }
    
    /**
     * 2. 새 세션 생성 (POST /api/sessions)
     * (DB에 실제 세션을 생성하도록 수정)
     */
    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody SessionCreationRequestDto requestDto) { // 👈 1. DTO 받기
        
        Long userId = requestDto.getUserId(); // 👈 2. DTO에서 userId 꺼내기

        // 3. 하드코딩 대신 전달받은 ID로 사용자를 찾음
        Member tempMember = memberRepository.findById(userId) 
                .orElseThrow(() -> new RuntimeException(userId + "번 사용자를 찾을 수 없습니다. (DB 확인 필요)"));

        // '똑똑한' 서비스를 호출해 DB에 실제 세션 생성
        CounsellingSession newSession = sessionService.createSession(tempMember);

        // 프론트가 요구하는 DTO 형식으로 변환하여 반환
        SessionCreationResponse response = SessionCreationResponse.builder()
                .id(newSession.getSessionId())
                .title("새 대화") // DB 요약 전 기본값
                .messages(Collections.emptyList())
                .build();
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/chat")
    public ResponseEntity<ChatResponseDto> handleChatRequest(@RequestBody ChatRequestDto requestDto) {
        
        // DB 저장, FastAPI 호출, 세션 업데이트가 모두 포함된 'addMessage' 호출
        ChatResponseDto response = sessionService.addMessage(requestDto);

        return ResponseEntity.ok(response);
    }
}