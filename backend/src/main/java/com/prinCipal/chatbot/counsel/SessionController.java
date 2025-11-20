package com.prinCipal.chatbot.counsel;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
			// 프론트 응답 DTO 사용
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ChatResponseDto("로그인이 필요합니다.", null));
		}

		ChatResponseDto response = sessionService.addMessage(requestDto, customUser.getMember());
		return ResponseEntity.ok(response);
	}
	
}