package com.prinCipal.chatbot.member;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.prinCipal.chatbot.exception.LoginFailedException;
import com.prinCipal.chatbot.exception.SignupValidationException;
import com.prinCipal.chatbot.exception.TokenValidationException;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import com.prinCipal.chatbot.oauth2.SocialTokenService;
import com.prinCipal.chatbot.security.BlackTokenRepository;
import com.prinCipal.chatbot.security.CookieHeader;
import com.prinCipal.chatbot.security.JwtAuthenticationFilter;
import com.prinCipal.chatbot.security.JwtTokenProvider;
import com.prinCipal.chatbot.security.RefreshTokenRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import java.util.regex.Pattern;

@RequiredArgsConstructor
@Service
public class MemberService{
	@Value("${jwt.refresh-token-days:2}")
	private int refreshDays;
	
	private final MemberRepository memberRepository;
	private final ForbiddenWordService forbiddenWordService;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider jwtTokenProvider;
	private final AuthenticationManager authenticationManager;
	private final CookieHeader cookieHeader;
	private final RefreshTokenRepository refreshTokenRepository;
	private final BlackTokenRepository blackTokenRepository;
	private SocialTokenService socialTokenService;
	private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
	
	@Value("${spring.security.oauth2.client.registration.naver.client-id}")
    private String naverClientId;
	
	@Value("${spring.security.oauth2.client.registration.naver.client-secret}")
    private String naverClientSecret;
	
	// 회원가입 시, 유효성 검사 
	public Map<String, String> validateSignup(SignupRequest signUpRequest) {
	    Map<String, String> errors = new HashMap<>();
	    if(this.memberRepository.existsByNickname(signUpRequest.getNickname())) {
	        errors.put("nickname", "이미 사용 중인 닉네임입니다.");
	    }
	    if(!signUpRequest.isPasswordMatching()) {
	        errors.put("password", "입력된 두 비밀번호가 다릅니다.");
	    }
	
	    return errors;
	}
	
	// 회원가입 
	public void registerUser(SignupRequest signUpRequest) {
		Map<String, String> errors = validateSignup(signUpRequest);
		 if (!errors.isEmpty()) {
		        throw new SignupValidationException(errors);
		    }
		 
		if(signUpRequest.getNickname().equals("admin")) {
			Member member = Member.builder()
			            .nickname(signUpRequest.getNickname())
			            .displayName(signUpRequest.getNickname())
			            .password(passwordEncoder.encode(signUpRequest.getPassword()))
			            .role(UserRole.ADMIN)
			            .build();
			this.memberRepository.save(member);
		}
		else {
			Member member = Member.builder()
		            .nickname(signUpRequest.getNickname())
		            .displayName(signUpRequest.getNickname())
		            .password(passwordEncoder.encode(signUpRequest.getPassword()))
		            .socialProvider("local")
		            .role(UserRole.USER)
		            .build();
			this.memberRepository.save(member);
		}
		 
	}

  // 새 큰토큰
	public String newAccessToken(String refreshToken, HttpServletResponse response) {
		if(refreshToken == null || !this.jwtTokenProvider.validateToken(refreshToken)) {
			throw new TokenValidationException("Refresh Token이 유효하지 않습니다.");
		}
		
		
		// Redis에서 해당 사용자 RefreshToken 확인
		String nickname = this.jwtTokenProvider.getUsernameFromToken(refreshToken);
		Member member = this.memberRepository.findByNickname(nickname)
					.orElseThrow(() -> new LoginFailedException("사용자를 찾을 수 없습니다."));
		 
		Long userId = member.getUserId();

		String storedRefreshToken = this.refreshTokenRepository.findByKey("RT:"+ userId);
		
		// Redis에 저장된 refreshToken이 없거나 일치하지 않으면 탈락. 
		if(storedRefreshToken == null || !storedRefreshToken.equals(refreshToken)) {
			throw new TokenValidationException("Refresh Token이 유효하지 않습니다.");
		}
		
		logger.info("🌀 RefreshToken으로 새 AccessToken 발급 시작");
		// DB에서 가져온 최신 정보로 새로운 Authentication 객체를 생성
	    Authentication newAuthentication = new UsernamePasswordAuthenticationToken(
	        member, // 또는 user 객체 자체를 principal로 사용
	        null,
	        Collections.singletonList(new SimpleGrantedAuthority(member.getRole().name()))
	    );

		// 만약, refreshToken의 만료가 가까워졌다면 새 refreshToken 생성 (새로 갱신) 
		if(this.jwtTokenProvider.isRefreshTokenExpiringSoon(refreshToken)) {
			String newRefreshToken = this.jwtTokenProvider.generateRefreshToken(newAuthentication);
			this.cookieHeader.SendCookieWithRefreshToken(response,newRefreshToken);
			this.refreshTokenRepository.save("RT:"+ userId,newRefreshToken,refreshDays);
		}
		
		// 새로운 Access 토큰 생성 
		return this.jwtTokenProvider.generateAccessToken(newAuthentication);
	}

	
	@Transactional
	public void logout(HttpServletRequest request, HttpServletResponse response) {
		// 기존 jwt 로그아웃 (Redis에서 RefreshToken 제거 + AccessToken 블랙리스트_
		this.jwtLogout(request, response);
		
		// 소셜 로그인 여부 확인 후 소셜 로그아웃 추가 수행
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if(auth != null && auth.getPrincipal() instanceof CustomOAuth2User oAuth2User) {
			Member member = oAuth2User.getMember();
			
			if(member.getSocialProvider() != null && !"local".equalsIgnoreCase(member.getSocialProvider())) {
				this.socialLogout(member,oAuth2User, auth);
			}
		}
		
		// 쿠키도 정리 
		this.cookieHeader.clearRefreshCookie(response);		
	}

	
	private void jwtLogout(HttpServletRequest request, HttpServletResponse response) {
		String accessToken = this.jwtTokenProvider.resolveAccessToken(request);
		
		if(accessToken != null && this.jwtTokenProvider.validateToken(accessToken)) {
			// 토큰 파싱 (만료 여부는 상관 없음, 만료되던 안되던 클레임만 뽑되, 서명을 검증해서 redis에서 삭제는 해야함)
			Claims claims = this.jwtTokenProvider.parseClaimsAllowExpired(accessToken);
			String jti = claims.getId();     // 토큰의 고유ID
			String identifier = claims.getSubject();  // 소셜쪽은, social_id로 토큰을 만들었어서. 아래와 같이 비교 해야함
			Optional<Member> optionalMember;
			
			if (identifier.startsWith("kakao_") || identifier.startsWith("google_") || identifier.startsWith("naver_")) {
			    optionalMember = this.memberRepository.findBySocialId(identifier);
			} else {
			    optionalMember = this.memberRepository.findByNickname(identifier);
			}

			Member member = optionalMember
			        .orElseThrow(() -> new LoginFailedException("회원 정보를 찾을 수 없습니다."));
			
			// RefreshToken을 redis에서 삭제
			this.refreshTokenRepository.delete("RT:" + member.getUserId());
			
			// accessToken을 더 이상 유효하지 않게 블랙리스트에 등록 (남은 유효기간 만큼) 
			long ttlSeconds = this.jwtTokenProvider.getRemainingTtlSeconds(accessToken); 
			if(ttlSeconds > 0) {
				this.blackTokenRepository.block(jti, ttlSeconds);
			}
		}
	}

	private void socialLogout(Member member, CustomOAuth2User oAuth2User, Authentication auth) {
		String provider = member.getSocialProvider();
		String socialToken = oAuth2User.getSocial_accessToken();
		
		if(socialToken == null) {
			System.out.println("소셜 액세스토큰 없음 !!! 로그아웃 스킵!!!");
			return;
		}
		
		try {
			switch(provider.toLowerCase()) {
			case "kakao" : {
				// 카카오 API를 요청하기 전, 유효한 토큰인지 확인 먼저 함 
				String kakaoAccessToken = this.socialTokenService.refreshKakaoAccessToken(auth);


				WebClient.create("https://kapi.kakao.com/v1/user/unlink")
				        .post()
				        .header("Authorization", "Bearer " + kakaoAccessToken)
				        .retrieve()
				        .bodyToMono(String.class)
				        .block(); 
				
				WebClient.create("https://kapi.kakao.com/v1/user/logout")
						 .post()
						 .headers(h -> h.setBearerAuth(kakaoAccessToken))
						 .retrieve()
						 .bodyToMono(String.class)
						 .block();
				System.out.println("카카오 로그아웃 완료 !!!!!!!");
				break;
			}
			case "google" :{
				 WebClient.create("https://oauth2.googleapis.com/revoke")
				 		  .post()
				 		  .bodyValue(Map.of("token",socialToken))
				 		  .retrieve()
				 		  .bodyToMono(String.class)
				 		  .block();
				 System.out.println("구글 로그아웃(토큰 해제) 완료 !!!!");
				 break;
			}
			// 네이버는 AccessToken 삭제 API를 줘야함 
			case "naver": {
				 // naver API를 요청하기 전, 유효한 토큰인지 확인 먼저 함 
				 String naverAccessToken = this.socialTokenService.refreshNaverAccessToken(auth);
				 WebClient.create("https://nid.naver.com/oauth2.0/token")
				 		  .post()
				 		  .uri(uriBuilder ->uriBuilder
				 				  .queryParam("grant_type", "delete")
				 				  .queryParam("client_id",  naverClientId)
	                              .queryParam("client_secret", naverClientSecret)
	                              .queryParam("access_token", naverAccessToken)
	                              .queryParam("service_provider", "NAVER")
				 				  .build())
				 		  .retrieve()
				 		  .bodyToMono(String.class)
				 		  .block();
				 System.out.println("네이버 로그아웃 완료!!");
				 break;
			}
			
			default : 
				throw new IllegalArgumentException("예상치 못한 소셜 : " + provider);
			}
		} 
		catch (Exception e) {
			System.err.println("⚠️ 소셜 로그아웃 실패 (" + provider + "): " + e.getMessage());
		}
	}
	

	// 회원탈퇴
	@Transactional
	public void withdraw(HttpServletRequest request, HttpServletResponse response) {
		String accessToken = this.jwtTokenProvider.resolveAccessToken(request);
		if(accessToken != null && this.jwtTokenProvider.validateToken(accessToken)) {
			Claims claims = this.jwtTokenProvider.parseClaimsAllowExpired(accessToken);
			String jti = claims.getId();     // 토큰의 고유ID
			Member member = this.memberRepository.findByNickname(claims.getSubject())
					.orElseThrow(() -> new LoginFailedException("회원 정보를 찾을 수 없습니다."));
			
			// accessToken을 더 이상 유효하지 않게 블랙리스트에 등록 (남은 유효기간 만큼) 
			long ttlSeconds = this.jwtTokenProvider.getRemainingTtlSeconds(accessToken); 
			if(jti != null && ttlSeconds > 0) {
				this.blackTokenRepository.block(jti, ttlSeconds);
				logger.info("회원 탈퇴 처리 진행 중. AccessToken 블랙리스트 등록(jti={}, ttl={}s)", jti, ttlSeconds);
			}
			
			// RefreshToken을 redis에서 삭제
			this.refreshTokenRepository.delete("RT:" + member.getUserId());
			logger.info("회원 탈퇴 처리 진행중. {} 의 RT 삭제완료", member.getNickname());
			
			// 회원 삭제 전 연관 데이터 정리 => 필요 시 
			// 예) 상담 기록, 소셜 링크 등
			// 		별도 서비스로 쪼개서, 순서 보장 필요시 트랜잭션 안에서 호출
			//		JPA cascade = REMOVE로 이미 묶여 있으면 생략 가능
			this.memberRepository.delete(member);
			logger.info("회원 탈퇴 처리 완료 ({})", member.getNickname());
			
		}
		
		// 쿠키도 정리
		this.cookieHeader.clearRefreshCookie(response);
	}

	
	// 닉네임(displayName) 변경
	@Transactional
	public void updatedisplayName(Long userId, String displayName) {
		
		// 1. ⭐️ (추가) 유효성 검사 (Validation)
        // 예: 2~15자의 한글, 영문, 숫자, 밑줄(_)만 허용
        String regex = "^[가-힣a-zA-Z0-9_]{2,15}$";
        if (displayName == null || !Pattern.matches(regex, displayName.trim())) {
            throw new IllegalArgumentException("닉네임은 2~15자의 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.");
        }
        
        String trimmedDisplayName = displayName.trim();
        
     //  욕설(비속어) 검사
        // (ForbiddenWordService가 생성자를 통해 주입되었다고 가정)
        if (forbiddenWordService.containsForbiddenWord(trimmedDisplayName)) {
             throw new IllegalArgumentException("닉네임에 사용할 수 없는 단어가 포함되어 있습니다.");
        }
		
		// 사용자 조회
		Member member = memberRepository.findById(userId)
				.orElseThrow(()-> new LoginFailedException("회원 정보를 찾을 수 없습니다."));
		
		// 4. ⭐️ (추가) 변경 감지 (현재 닉네임과 동일한지 확인)
        if (member.getDisplayName() != null && member.getDisplayName().equals(trimmedDisplayName)) {
            throw new IllegalArgumentException("현재 닉네임과 동일합니다.");
        }
        
		// member엔티티에 updateNickname 메소드 호출
		member.updatedisplayName(trimmedDisplayName);
		memberRepository.save(member);
	}
	
	// 비밀번호 변경
	@Transactional
	public void updatePassword(Long userId, String currentPassword, String newPassword) {
		
		// 사용자 조회
		Member member = memberRepository.findById(userId)
				.orElseThrow(()-> new LoginFailedException("회원 정보를 찾을 수 없습니다."));
		// 현재 비밀번호 검증
		if(!passwordEncoder.matches(currentPassword, member.getPassword())) {
			throw new LoginFailedException("현재 비밀번호가 일치하지 않습니다.");
		}
		// 새 비밀번호 정책 검사
		validatePassword(newPassword, member.getDisplayName()).ifPresent(error -> {
			throw new IllegalArgumentException(error); // 유효성 검사 실패 시 예외 발생
		});
		// 새 비밀번호 인코딩 및 member 엔티티 업데이트
		member.updatePassword(passwordEncoder.encode(newPassword));
	}
	
	/*
	 * 비밀번호 유효성 검사
	 * @param password 검사할 비밀번호
	 * @param nickname 닉네임 (비밀번호에 포함되는지 검사하기 위함)
	 * @return Optional.empty() (성공) 또는 Optional.of(에러메시지) (실패)
	 */
	private Optional<String> validatePassword(String password, String nickname){
		if(password == null || password.isEmpty()) {
			return Optional.of("비밀번호를 입력해주세요.");
		}
		if(password.length()<8) {
			return Optional.of("비밀번호는 8자 이상이어야 합니다.");
		}
		// 2. 조합: 영문 대/소문자, 숫자 포함
	    if (!password.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$")) {
	        return Optional.of("비밀번호는 영문 대문자, 소문자, 숫자를 모두 포함해야 합니다.");
	    }
	    // 3. 제한: 닉네임 포함 금지
	    if(nickname != null && !nickname.isEmpty()&&password.contains(nickname)) {
	    	return Optional.of("비밀번호에 닉네임(아이디)을 포함할 수 없습니다.");
	    }
	    // 4. 제한: 연속된/단순한 문자열
	    if(containsSequential(password)) {
	    	return Optional.of("연속된 문자(예: 1234, abcd)는 사용할 수 없습니다.");
	    }
	    // 5. 제한: 동일한 문자 반복
	    if(containsRepeated(password, 3)) {// 예: 3번 이상 반복 (aaa, 111)
	    	return Optional.of("동일한 문자를 3번이상 반복할 수 없습니다.");
	    }
	    return Optional.empty(); // 모든 검사 통과
	    
	}
	// 3자리 이상 연속된 문자/숫자 (예: 123, abc, qwe)
	private boolean containsSequential(String s) {
	    for (int i = 0; i < s.length() - 2; i++) {
	        char c1 = s.charAt(i);
	        char c2 = s.charAt(i + 1);
	        char c3 = s.charAt(i + 2);
	        if (c2 == c1 + 1 && c3 == c2 + 1) {
	            return true; // 123, abc
	        }
	        if (c2 == c1 - 1 && c3 == c2 - 1) {
	            return true; // 321, cba
	        }
	    }
	    return false;
	}

	// 3자리 이상 동일한 문자 (예: 111, aaa)
	private boolean containsRepeated(String s, int count) {
	    for (int i = 0; i < s.length() - (count - 1); i++) {
	        char c = s.charAt(i);
	        boolean repeated = true;
	        for (int j = 1; j < count; j++) {
	            if (s.charAt(i + j) != c) {
	                repeated = false;
	                break;
	            }
	        }
	        if (repeated) {
	            return true;
	        }
	    }
	    return false;
	}
	
	
	
	
	
}