package com.prinCipal.chatbot.counsel;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.prinCipal.chatbot.dto.ChatRequestDto; // (A) 프론트 요청 DTO
import com.prinCipal.chatbot.dto.ChatResponseDto; // (B) 프론트 응답 DTO
import com.prinCipal.chatbot.dto.SessionCreationResponse; // (C) 새 세션 응답 DTO
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import org.springframework.data.redis.core.StringRedisTemplate; //1. Redis 템플릿 임포트
import com.fasterxml.jackson.databind.ObjectMapper;//2. JSON 변환기 임포트
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SessionController {

	private final SessionService sessionService;
	private final StringRedisTemplate stringRedisTemplate;
	private final ObjectMapper objectMapper;

	
	/* 1. 초기 데이터 로드 (GET /api/chats) */
	 
	@GetMapping("/chats")
	public ResponseEntity<?> getInitialData(@AuthenticationPrincipal CustomOAuth2User customUser) {
		if (customUser == null) {
			Map<String, Object> initialData = new HashMap<>();
			initialData.put("recents", Collections.emptyList());
			initialData.put("sessions", Collections.emptyMap());
			initialData.put("userId", null);
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(initialData);
		}
		Member member = customUser.getMember();
		Map<String, Object> initialData = sessionService.getInitialDataForUser(member);
		return ResponseEntity.ok(initialData);
	}
	 
	@PostMapping("/sessions")
	public ResponseEntity<?> createSession(@AuthenticationPrincipal CustomOAuth2User customUser) {

		if (customUser == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Member tempMember = customUser.getMember();

		CounsellingSession newSession = sessionService.createSession(tempMember);
		SessionCreationResponse response = SessionCreationResponse.builder().id(newSession.getSessionId()).title("새 대화")
				.messages(Collections.emptyList()).build();

		return ResponseEntity.ok(response);
	}

	@PostMapping("/chat")
	public ResponseEntity<ChatResponseDto> handleChatRequest(@RequestBody ChatRequestDto requestDto,
	        @AuthenticationPrincipal CustomOAuth2User customUser) {

	    if (customUser == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body(new ChatResponseDto("로그인이 필요합니다.", null, null));
	    }
    
	    // [변경] addMessage -> processChat 호출
	    // 내부에서 Redis 체크 -> (없으면 FastAPI) -> Async DB 저장 -> 응답 반환 순으로 동작
	    ChatResponseDto response = sessionService.processChat(requestDto, customUser.getMember());

	    return ResponseEntity.ok(response);

	}


	// Redis 데이터 확인용 임시 API
	@GetMapping("/debug/redis")
	public ResponseEntity<Object> checkRedisCache(@RequestParam String query) {
	    String key = "chat:response:" + query.trim(); // 저장할 때 쓴 키 규칙 그대로 적용
	    
	    try {
	        // 1. Redis에서 String(JSON형태) 가져오기
	        String jsonString = stringRedisTemplate.opsForValue().get(key);
	        
	        if (jsonString == null) {
	            return ResponseEntity.status(404).body("해당 질문에 대한 캐시 데이터가 없습니다.");
	        }

	        // 2. 보기 좋게 JSON 객체로 변환해서 반환
	        Object jsonObject = objectMapper.readValue(jsonString, Object.class);
	        return ResponseEntity.ok(jsonObject);

	    } catch (Exception e) {
	        return ResponseEntity.status(500).body("에러 발생: " + e.getMessage());
	    }
	}
	
	// 세션 삭제(개별 삭제)
	@DeleteMapping("/sessions/{id}")
	public ResponseEntity<?> deleteSession(@PathVariable Long id,@AuthenticationPrincipal CustomOAuth2User customUser){
		
	
	// 로그인 확인
		if(customUser == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}
		
		Member member = customUser.getMember();
		// 2. 삭제 서비스 호출 (이 부분이 없어서 404 에러가 났던 것입니다)
        sessionService.deleteSession(id, member);

        return ResponseEntity.ok("세션이 삭제되었습니다.");
	}
	
	//세선 전체 삭제
	@DeleteMapping("/sessions/clear-all")
	public ResponseEntity<?> clearAllSessions(@AuthenticationPrincipal CustomOAuth2User customUser){
		
			if(customUser == null) {
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
			}
			
			Member member = customUser.getMember();
			
			sessionService.deleteAllSessions(member);
			
			return ResponseEntity.ok("모든 대화 기록이 삭제되었습니다.");
		
		}
		

    // 4. 상담 수동 종료 (POST /api/sessions/{id}/end)
    @PostMapping("/sessions/{id}/end")
    public ResponseEntity<?> endSession(@PathVariable Long id, @AuthenticationPrincipal CustomOAuth2User customUser) {
        if (customUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        sessionService.endSessionManually(id, customUser.getMember());
        return ResponseEntity.ok("상담이 종료되었습니다.");
    }

    // 5. 상담 재시작 (POST /api/sessions/{id}/restart)
    @PostMapping("/sessions/{id}/restart")
    public ResponseEntity<?> restartSession(@PathVariable Long id, @AuthenticationPrincipal CustomOAuth2User customUser) {
         if (customUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        sessionService.restartSessionManually(id, customUser.getMember());
        return ResponseEntity.ok("상담이 재개되었습니다.");
    }
	

}