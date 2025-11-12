package com.prinCipal.chatbot.member;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
	 
	
	@PostMapping("/login")
	   public ResponseEntity<TokenResponse> loginUser(@Valid @RequestBody LoginRequest loginRequest,HttpServletResponse response){
	      String accessToken = this.memberService.loginUser(loginRequest, response);
	      return ResponseEntity.ok(new TokenResponse("success", "로그인 성공", accessToken));

	   }
	
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
}

