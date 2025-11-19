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
import org.springframework.web.bind.annotation.RestController;

import com.prinCipal.chatbot.dto.ChatRequestDto; // 👈 (A) 프론트 요청 DTO
import com.prinCipal.chatbot.dto.ChatResponseDto; // 👈 (B) 프론트 응답 DTO
import com.prinCipal.chatbot.dto.SessionCreationResponse; // 👈 (C) 새 세션 응답 DTO
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SessionController {

	private final SessionService sessionService;

	/**
	 * 1. 초기 데이터 로드 (GET /api/chats)
	 */
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

	/**
	 * 2. 새 세션 생성 (POST /api/sessions)
	 */
	@PostMapping("/sessions")
	public ResponseEntity<?> createSession(@AuthenticationPrincipal CustomOAuth2User customUser) {

		if (customUser == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Member tempMember = customUser.getMember();

		CounsellingSession newSession = sessionService.createSession(tempMember);

		// (참고) 이 DTO가 필요합니다.
		SessionCreationResponse response = SessionCreationResponse.builder().id(newSession.getSessionId()).title("새 대화")
				.messages(Collections.emptyList()).build();

		return ResponseEntity.ok(response);
	}

	/**
	 * 3. 채팅 메시지 전송 (POST /api/chat)
	 */
	@PostMapping("/chat")
	// 👈 [수정] 요청: ChatRequestDto (A) / 응답: ChatResponseDto (B)
	public ResponseEntity<ChatResponseDto> handleChatRequest(@RequestBody ChatRequestDto requestDto,
			@AuthenticationPrincipal CustomOAuth2User customUser) {

		if (customUser == null) {
			// 👈 [수정] (B) 프론트 응답 DTO 사용
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ChatResponseDto("로그인이 필요합니다.", null));
		}

		ChatResponseDto response = sessionService.addMessage(requestDto, customUser.getMember());

		return ResponseEntity.ok(response);
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
		
	
	
	
	
}