package com.prinCipal.chatbot.oauth2;

import java.time.Instant;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken.TokenType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SocialTokenService {
	
	@Value("${spring.security.oauth2.client.registration.kakao.client-id}")
	private String kakaoClient_id;
	
	@Value("${spring.security.oauth2.client.registration.naver.client-id}")
    private String naverClientId;
	
	@Value("${spring.security.oauth2.client.registration.naver.client-secret}")
    private String naverClientSecret;
	
	private final OAuth2AuthorizedClientService authorizedClientService;
	private final WebClient webClient = WebClient.create();
	
	public String refreshNaverAccessToken(Authentication authentication) {
		OAuth2AuthorizedClient client = this.authorizedClientService.loadAuthorizedClient("kakao",authentication.getName());
		if(client == null) {
			throw new IllegalStateException("인증된 네이버 클라이언트를 찾을 수 없습니다.");
        }
		
		OAuth2AccessToken accessToken = client.getAccessToken();
		
		if(accessToken.getExpiresAt() != null && accessToken.getExpiresAt().isBefore(Instant.now())) {
			String refreshToken = client.getRefreshToken().getTokenValue();	
			
			// 네이버 토큰 갱신 요청 
			String newAccessToken = webClient.post()
										.uri("https://nid.naver.com/oauth2.0/token")
										.bodyValue(Map.of(
												"grant_type", "refresh_token",
												"client_id", naverClientId,  
												"client_secret", naverClientSecret,
						                        "refresh_token", refreshToken
										))
										.retrieve()
										.bodyToMono(JsonNode.class)
										.map(json->json.get("access_token").asText())
										.block();
			System.out.println("새 네이버 AccessToken 발급 완료: " + newAccessToken);
			
			// AccessToken 다시 저장
            OAuth2AuthorizedClient updatedClient = new OAuth2AuthorizedClient(
                    client.getClientRegistration(),
                    client.getPrincipalName(),
                    new OAuth2AccessToken(
                            TokenType.BEARER,
                            newAccessToken,
                            Instant.now(),
                            Instant.now().plusSeconds(60 * 60)  // 네이버 AccessToken 유효기간 (1시간)
                    ),
                    client.getRefreshToken()
            );
            
            authorizedClientService.saveAuthorizedClient(updatedClient, authentication);
            return newAccessToken;
		}
		
		System.out.println("유효해서 그냥 네이버 accessToken 반환을 하나요?");
		// 유효하면 그대로 반환
        return accessToken.getTokenValue();
		
	}
	public String refreshKakaoAccessToken(Authentication authentication) {
		OAuth2AuthorizedClient client = this.authorizedClientService.loadAuthorizedClient("kakao",authentication.getName());
		if(client == null) {
			throw new IllegalStateException("인증된 카카오 클라이언트를 찾을 수 없습니다.");
        }
		
		OAuth2AccessToken accessToken = client.getAccessToken();
		
		if(accessToken.getExpiresAt() != null && accessToken.getExpiresAt().isBefore(Instant.now())) {
			String refreshToken = client.getRefreshToken().getTokenValue();	
			
			// 카카오 토큰 갱신 요청 
			String newAccessToken = webClient.post()
										.uri("https://kauth.kakao.com/oauth/token")
										.bodyValue(Map.of(
						                        "grant_type", "refresh_token",
						                        "client_id", kakaoClient_id,  
						                        "refresh_token", refreshToken
						                 ))
										.retrieve()
										.bodyToMono(JsonNode.class)
										.map(json->json.get("access_token").asText())
										.block();
			System.out.println(" 새 카카오 AccessToken 발급 완료: " + newAccessToken);

			// 새 AccessToken을 authorizedClientService에 갱신
            OAuth2AuthorizedClient updatedClient = new OAuth2AuthorizedClient(
                    client.getClientRegistration(),
                    client.getPrincipalName(),
                    new OAuth2AccessToken(
                            TokenType.BEARER,
                            newAccessToken,
                            Instant.now(),
                            Instant.now().plusSeconds(6 * 60 * 60)
                    ),
                    client.getRefreshToken()
            );
            authorizedClientService.saveAuthorizedClient(updatedClient, authentication);

            return newAccessToken;
		}
		
		// 유효하면 그대로 반환
        return accessToken.getTokenValue();

	}
}
