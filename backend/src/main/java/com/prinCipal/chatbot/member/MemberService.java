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

@RequiredArgsConstructor
@Service
public class MemberService{
	@Value("${jwt.refresh-token-days:2}")
	private int refreshDays;
	
	private final MemberRepository memberRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider jwtTokenProvider;
	private final AuthenticationManager authenticationManager;
	private final CookieHeader cookieHeader;
	private final RefreshTokenRepository refreshTokenRepository;
	private final BlackTokenRepository blackTokenRepository;
	private SocialTokenService socialTokenService;
	private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
	
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
			String identifier = claims.getSubject();
			Optional<Member> optionalMember;
			
			if (identifier.startsWith("kakao_") || identifier.startsWith("google_")) {
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
				 WebClient.create("https://nid.naver.com/oauth2.0/token")
				 		  .post()
				 		  .uri(uriBuilder ->uriBuilder
				 				  .queryParam("grant_type", "delete")
				 				  .queryParam("client_id", "{네이버_CLIENT_ID}")
	                              .queryParam("client_secret", "{네이버_CLIENT_SECRET}")
	                              .queryParam("access_token", socialToken)
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

	
	public MemberProfileDto getUserProfile(String nickname) {
	    Member member = this.memberRepository.findByNickname(nickname)
	            .orElseThrow(() -> new LoginFailedException("회원 정보를 찾을 수 없습니다."));
	    return new MemberProfileDto(member);
	}

	

}


	