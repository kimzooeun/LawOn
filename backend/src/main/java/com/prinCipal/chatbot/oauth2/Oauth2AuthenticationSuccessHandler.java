package com.prinCipal.chatbot.oauth2;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.security.CookieHeader;
import com.prinCipal.chatbot.security.JwtTokenProvider;
import com.prinCipal.chatbot.security.RefreshTokenRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class Oauth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler{

	private final JwtTokenProvider jwtTokenProvider;
	private final CookieHeader cookieHeader;
	private final RefreshTokenRepository refreshTokenRepository;
	private final OAuth2AuthorizedClientRepository authorizedClientRepository;
	private final MemberRepository memberRepository; // ⭐ 회원 삭제용
	private final SocialTokenService socialTokenService;
	
	@Value("${app.frontend.url}")
	private String frontendUrl;
	
	@Value("${jwt.refresh-token-days}")
	private int refreshDays;
	

	@Value("${spring.security.oauth2.client.registration.naver.client-id}")
	private String naverClientId;

	@Value("${spring.security.oauth2.client.registration.naver.client-secret}")
	private String naverClientSecret;
	
	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException{
		
	
		String requestUri = request.getRequestURI();
	    if(requestUri.contains("withdraw")) {
	    	CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();
	        Member member = oAuth2User.getMember();
	    	handleSocialWithdraw(request, response, authentication, oAuth2User, member);
	        return; // 더 이상 로그인 로직 안 태움
	    }
	    
		System.out.println("Jwt 로그인 처리중 !!!");
		
		
		 // CustomOAuth2User에서 사용자 정보 추출
	    CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();
	    Member member  = oAuth2User.getMember();
	    String socialId = member.getSocialId(); 

	    Authentication newAuthentication = new UsernamePasswordAuthenticationToken(
	            socialId, 
	            null,
	            authentication.getAuthorities()
	    );
	    
	   
	
		// 로그인 성공(인증 성공) 시 , 처리되는 영역
		String accessToken = this.jwtTokenProvider.generateAccessToken(newAuthentication);
		String refreshToken = this.jwtTokenProvider.generateRefreshToken(newAuthentication);
		this.cookieHeader.SendCookieWithRefreshToken(response, refreshToken);
	

		// redis에 refreshToken 저장 
	    String redisKey = "RT:" + member.getUserId();
	    this.refreshTokenRepository.save(redisKey, refreshToken, refreshDays);

	    
		String encodedAccessToken = URLEncoder.encode(accessToken, StandardCharsets.UTF_8);
		Long encodedUserid = member.getUserId();
		String encodedNickname = URLEncoder.encode(member.getNickname(), StandardCharsets.UTF_8);
		String encodedDisplayName = URLEncoder.encode(member.getDisplayName(), StandardCharsets.UTF_8);
		String encodedProvider = URLEncoder.encode(member.getSocialProvider(), StandardCharsets.UTF_8);
		
		// 프론트로 redirect 
		String targetUrl = String.format(
			    "%s/oauth2_success/?token=%s&userid=%s&nickname=%s&displayName=%s&provider=%s",
			    frontendUrl,
			    encodedAccessToken,
			    encodedUserid,
			    encodedNickname,
			    encodedDisplayName,
			    encodedProvider
			);
	        
	    System.out.println("🚀 Redirecting to: " + targetUrl);  // 디버깅용
        
        response.sendRedirect(targetUrl);

	}
	
	
	private void handleSocialWithdraw(HttpServletRequest request,HttpServletResponse response,Authentication authentication,CustomOAuth2User oAuth2User,Member member) throws IOException {

		System.out.println("소셜 회원탈퇴 플로우 진입 (state=withdraw)");
		
		OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
		
		OAuth2AuthorizedClient client = authorizedClientRepository.loadAuthorizedClient(
		oauthToken.getAuthorizedClientRegistrationId(),
		authentication,
		request
		);
		
		if (client == null || client.getAccessToken() == null) {
		System.out.println("⚠️ OAuth2AuthorizedClient 또는 AccessToken 없음. 소셜 unlink 스킵.");
		} else {
		String accessToken = client.getAccessToken().getTokenValue();
		String provider = member.getSocialProvider();
		
		try {
			switch (provider.toLowerCase()) {
		
			case "kakao": {
				// 카카오 API를 요청하기 전, 유효한 토큰인지 확인 먼저 함
				String kakaoAccessToken = this.socialTokenService.refreshKakaoAccessToken(authentication);
	
				WebClient.create("https://kapi.kakao.com/v1/user/unlink").post()
						.header("Authorization", "Bearer " + kakaoAccessToken).retrieve().bodyToMono(String.class)
						.block();
				break;
			}
			case "google" : {
			WebClient.create("https://oauth2.googleapis.com/revoke")
			      .post()
			      .bodyValue(Map.of("token", accessToken))
			      .retrieve()
			      .bodyToMono(String.class)
			      .block();
			System.out.println("✅ 구글 토큰 revoke 완료");
			break;
			}
			case "naver": {
				// naver API를 요청하기 전, 유효한 토큰인지 확인 먼저 함
				String naverAccessToken = this.socialTokenService.refreshNaverAccessToken(authentication);
				WebClient.create("https://nid.naver.com/oauth2.0/token").post()
						.uri(uriBuilder -> uriBuilder.queryParam("grant_type", "delete")
								.queryParam("client_id", naverClientId).queryParam("client_secret", naverClientSecret)
								.queryParam("access_token", naverAccessToken).queryParam("service_provider", "NAVER")
								.build())
						.retrieve().bodyToMono(String.class).block();
				System.out.println("네이버 로그아웃 완료!!");
				break;
			}
			default:
				throw new IllegalArgumentException("예상치 못한 소셜 : " + provider);
			}
		} catch (Exception e) {
			System.err.println("⚠️ 소셜 로그아웃 실패 (" + provider + "): " + e.getMessage());
		}
	 }
			
		// RefreshToken을 redis에서 삭제
		this.refreshTokenRepository.delete("RT:" + member.getUserId());
	    this.memberRepository.delete(member);
	    // 쿠키도 정리
		this.cookieHeader.clearRefreshCookie(response);
		
		String redirectUrl = frontendUrl + "/";
		System.out.println("✅ 소셜 회원탈퇴 완료 → redirect: " + redirectUrl);
		getRedirectStrategy().sendRedirect(request, response, redirectUrl);

}
}