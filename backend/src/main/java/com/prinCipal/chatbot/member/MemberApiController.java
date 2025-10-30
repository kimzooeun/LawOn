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


@RequestMapping("/api/auth")
@RequiredArgsConstructor
@RestController
public class MemberApiController {

	private final MemberService memberService;
	private final JwtTokenProvider jwtTokenProvider;
	private static final Logger logger = LoggerFactory.getLogger(MemberApiController.class);
	 
	@PostMapping("/signup")
	public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest){
		    
		logger.info("SignupRequest 들어옴: {}", signUpRequest);
			this.memberService.registerUser(signUpRequest);
			return ResponseEntity.ok(Map.of("status", "success", "message", "회원가입 성공"));
	}
	
	@PostMapping("/login")
	public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest loginRequest,  HttpServletResponse response){
		String accessToken = this.memberService.loginUser(loginRequest, response);
	
		return ResponseEntity.ok(Map.of("status", "success", "message", "로그인 성공", "token" , accessToken));
	}
	


	// 새로운 AccessToken 발급하기 위함 
	@PostMapping("/refresh")
	public ResponseEntity<Map<String, String>> refresh(@CookieValue(name="refreshToken", required = false) String refreshToken, 
												HttpServletResponse response){
		if(refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		
		return ResponseEntity.ok(Map.of("accessToken",this.memberService.newAccessToken(refreshToken, response)));
	}
	
	
	@GetMapping("/profile")
	public ResponseEntity<Member> getUserProfile(Authentication authentication){
		String nickname = authentication.getName();
		Member memberProfile = this.memberService.getUserProfile(nickname);
        return ResponseEntity.ok(memberProfile);
	}
	
	 
//	@GetMapping("/profile")
//    public AppUser profile(Authentication authentication) {
//        String username = authentication.getName();
//        AppUser userProfile = appUserService.getUserProfile(username);
//        return userProfile;
//    }


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
	
	
}


