package com.prinCipal.chatbot.member;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.prinCipal.chatbot.security.JwtTokenProvider;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@RequestMapping("/auth")
@RequiredArgsConstructor
@RestController
public class MemberApiController {

	private final MemberService memberService;
	private final JwtTokenProvider jwtTokenProvider;
	private static final Logger logger = LoggerFactory.getLogger(MemberApiController.class);
	 
	
	@PostMapping("/login")
	public ResponseEntity<TokenResponse> loginUser(@Valid @RequestBody LoginRequest loginRequest,HttpServletResponse response){
		String accessToken = this.memberService.loginUser(loginRequest, response);
		return ResponseEntity.ok(new TokenResponse("success", "로그인 성공", accessToken));

	}
	
	

	
	@PostMapping("/signup")
	public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest){
		    
		logger.info("SignupRequest 들어옴: {}", signUpRequest);
			this.memberService.registerUser(signUpRequest);
			return ResponseEntity.ok(Map.of("status", "success", "message", "회원가입 성공"));
	}
	
	
	
	
	// 새로운 AccessToken 발급하기 위함 
	@PostMapping("/refresh")
	public ResponseEntity<TokenResponse> refresh(@CookieValue(name="refreshToken", required = false) String refreshToken, 
												HttpServletResponse response){
		if(refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		
		String newAccessToken = this.memberService.newAccessToken(refreshToken, response);
		return ResponseEntity.ok(new TokenResponse("success", "토큰 재발급 완료", newAccessToken));
	}
	
	
	

	// Refresh Token을 서버 쿠키에서 삭제하는 방식
	@PostMapping("/logout")
	public HttpServletResponse deleteTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
        		.httpOnly(true)
        		.secure(false)
                .maxAge(0)
                .sameSite("Lax") 
                .path("/")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
        return response;
    }
	
	
	
	@GetMapping("/profile")
	public ResponseEntity<MemberProfileDto> getUserProfile(Authentication authentication){
		String nickname = authentication.getName();
		MemberProfileDto memberProfile = this.memberService.getUserProfile(nickname);
        return ResponseEntity.ok(memberProfile);
	}
	
	
	
}


