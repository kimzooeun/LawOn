package com.prinCipal.chatbot.member;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.prinCipal.chatbot.dto.UpdateProfileRequestDto;
import com.prinCipal.chatbot.exception.LoginFailedException;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import com.prinCipal.chatbot.security.JwtTokenProvider;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@RequestMapping("/api")
@RequiredArgsConstructor
@RestController
public class MemberApiController {

	private final MemberService memberService;
	private final JwtTokenProvider jwtTokenProvider;
	private final MemberRepository memberRepository;
	
	private static final Logger logger = LoggerFactory.getLogger(MemberApiController.class);
	 

	
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

		
		
		@PostMapping("/profile/update-name")
		public ResponseEntity<?> updateProfileName(
	            // --- ( 1. 수정 ) ---
	            // @AuthenticationPrincipal을 다시 사용합니다.
	            // JwtTokenProvider를 수정했기 때문에 이제 정상 작동합니다.
				@AuthenticationPrincipal CustomOAuth2User customOAuth2User,
				@Valid @RequestBody UpdateProfileRequestDto requestDto){
			
	        // --- ( 2. 수정 ) ---
	        // SecurityContextHolder에서 principal을 꺼내는 복잡한 로직 전체를 삭제합니다.
	        // ( if (authentication == null...) 부터 (if(member == null)...) 까지 전부 삭제 )
	        // ---
		
			if(customOAuth2User == null) {
				System.out.println("오류확인333333333333333333333");
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
			}
			
			try {
	            // --- ( 3. 수정 ) ---
	            // customOAuth2User를 서비스로 직접 전달합니다.
	            // MemberService가 이 객체를 받아 닉네임을 꺼내고
	            // DB에서 Member를 다시 조회할 것입니다. (Detached Entity 문제 해결)
				System.out.println("nickname"+requestDto.getNewDisplayName());
				MemberProfileDto updatedProfile = memberService.updateDisplayName(customOAuth2User, requestDto);
				
				return ResponseEntity.ok(Map.of(
						"status","success",
						"message","displayname이 성공적으로 변경되었습니다.",
						"profile", updatedProfile
						));
				
			}catch(Exception e) {
				logger.error("닉네임 변경 중 오류 발생", e);
				return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
						.body(Map.of("message", "이름 변경 중 서버 오류가 발생했습니다."));
			}
		}
		
	}
	
	
	
	
	
	


