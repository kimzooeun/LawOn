package com.prinCipal.chatbot.oauth2;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prinCipal.chatbot.member.Member;
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
	private final ObjectMapper objectMapper = new ObjectMapper(); // JSON 처리를 위한 ObjectMapper

	@Value("${app.frontend.url}")
	private String frontendUrl;
	
	@Value("${jwt.refresh-token-days}")
	private int refreshDays;
	
	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException{
		
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
	            "%s/oauth2_success?token=%s&nickname=%s&provider=%s",
	            frontendUrl,  // http://localhost:3000
	            encodedAccessToken, 
	            encodedUserid,
	            encodedNickname,
	            encodedDisplayName,
	            encodedProvider
	        );
	        
	    System.out.println("🚀 Redirecting to: " + targetUrl);  // 디버깅용
        
        response.sendRedirect(targetUrl);

	}
}
