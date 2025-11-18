package com.prinCipal.chatbot.member;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.access.AccessDeniedException;

import com.prinCipal.chatbot.exception.LoginFailedException;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import com.prinCipal.chatbot.security.JwtTokenProvider;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;


@RequestMapping("/api")
@RequiredArgsConstructor
@RestController
public class MemberApiController {

	private final MemberService memberService;
	private final JwtTokenProvider jwtTokenProvider;
	
	
  
	
	

	@PostMapping("/signup")
	public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest){
			this.memberService.registerUser(signUpRequest);
			return ResponseEntity.ok(Map.of("status", "success", "message", "회원가입 성공"));
	}
	
	@GetMapping("/profile/me")
	public ResponseEntity<MemberProfileDto> getUserProfile(@AuthenticationPrincipal CustomOAuth2User customOAuth2User){
		if (customOAuth2User != null) {
			Member member = customOAuth2User.getMember();
			return ResponseEntity.ok(new MemberProfileDto(member));
		} else {
			// 인증되지 않은 경우 401 Unathorized 응답
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
	}
	
	// 새로운 AccessToken 발급하기 위함 
	@PostMapping("/refresh")
	public ResponseEntity<TokenResponse> refresh(@CookieValue(name="refreshToken", required = false) String refreshToken, 
												HttpServletResponse response){
		if(refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(new TokenResponse("fail", "RefreshToken이 없거나 만료됨", null));
		}
		
		String newAccessToken = this.memberService.newAccessToken(refreshToken, response);
		return ResponseEntity.ok(new TokenResponse("success", "토큰 재발급 완료", newAccessToken));
	}
	
	@PostMapping("/logout")
	public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response){
		try {
			System.out.println();
			this.memberService.logout(request,response);
			return ResponseEntity.ok(Map.of("message", "로그아웃 완료"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("로그아웃 실패: " + e.getMessage());
		}
	}
	
	// 회원 탈퇴 
	@PostMapping("/withdraw")
	public ResponseEntity<?> withdraw(HttpServletRequest request, HttpServletResponse response){
		this.memberService.withdraw(request,response);
		return ResponseEntity.ok(Map.of("status", "success", "message", "회원탈퇴가 완료되었습니다."));
		
	}
	
	// 닉네임 변경
	@PutMapping("/user/{id}/nickname")
	public ResponseEntity<?> updateDisplayName(
			@PathVariable Long id,
			@RequestBody Map<String, String> body,
			@AuthenticationPrincipal CustomOAuth2User customOAuth2User){
		
		// URL의 ID와 실제 로그인한 사용자의 ID가 일치하는지 확인
		if(!customOAuth2User.getMember().getUserId().equals(id)) {
			throw new AccessDeniedException("권한이 없습니다.");
		}
		
		String displayName = body.get("display_name");
		if(displayName == null || displayName.trim().isEmpty()) {
			return ResponseEntity.badRequest().body("닉네임이 필요합니다.");
		}
		
		memberService.updatedisplayName(id, displayName.trim());
		return ResponseEntity.ok(Map.of("status","success","message","닉네임이 변경되었습니다."));
		
	}
	
	// 비밀번호 변경
	@PutMapping("/user/{id}/password")
	public ResponseEntity<?> updatePassword(
			@PathVariable Long id,
			@RequestBody Map<String, String> body,
			@AuthenticationPrincipal CustomOAuth2User customOAuth2User ){
		
		// URL의 ID와 실제 로그인한 사용자의 ID가 일치하는지 확인
		if(!customOAuth2User.getMember().getUserId().equals(id)) {
			throw new AccessDeniedException("권한이 없습니다.");
			
		}
		String currentPassword = body.get("currentPassword");
		String newPassword = body.get("newPassword");
		
		if(currentPassword == null || newPassword == null) {
			return ResponseEntity.badRequest().body("모든 필드가 필요합니다.");
		}
		memberService.updatePassword(id, currentPassword ,newPassword);
		return ResponseEntity.ok(Map.of("status","success","message","비밀번호가 변경되었습니다."));
	}
		
}