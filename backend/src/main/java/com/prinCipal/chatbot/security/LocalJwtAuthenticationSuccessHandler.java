package com.prinCipal.chatbot.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

// Spring의 기본 핸들러를 상속하지 않고, AuthenticationSuccessHandler 인터페이스 구현
@Component
@RequiredArgsConstructor
public class LocalJwtAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final CookieHeader cookieHeader;
    private final ObjectMapper objectMapper = new ObjectMapper(); // JSON 처리를 위한 ObjectMapper
    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {

        // 사용자 정보 (CustomOAuth2User) 추출
        CustomOAuth2User customUser = (CustomOAuth2User) authentication.getPrincipal();
        
        // Authentication 객체 재구성 (JWT 생성을 위해 닉네임 사용)
        // 일반 로그인 시에도 SocialId 대신 Nickname을 Principal로 사용하는 것이 일관적
        Authentication newAuthentication = new UsernamePasswordAuthenticationToken(
                customUser.getMember().getNickname(), 
                null,
                authentication.getAuthorities()
        );
        
        // 토큰 생성
        String accessToken = this.jwtTokenProvider.generateAccessToken(newAuthentication);
        String refreshToken = this.jwtTokenProvider.generateRefreshToken(newAuthentication);
        this.cookieHeader.SendCookieWithRefreshToken(response, refreshToken);
        
        // redis에 refreshToken 저장 
        redisTemplate.opsForValue().set(
        		"RT:"+ customUser.getMember().getUserId(),
        		 refreshToken, 2 ,TimeUnit.DAYS
        );
        
        // JSON 응답 설정 (200 OK)
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        // 토큰과 사용자 정보를 JSON Body에 담아 전송
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("accessToken", accessToken);
        responseBody.put("nickname", customUser.getMember().getNickname());
        responseBody.put("provider", customUser.getMember().getSocialProvider()); // local인지 kakao인지 등
        
        response.getWriter().write(objectMapper.writeValueAsString(responseBody));
    }
}


