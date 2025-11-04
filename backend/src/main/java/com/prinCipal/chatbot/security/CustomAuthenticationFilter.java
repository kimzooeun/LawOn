package com.prinCipal.chatbot.security;

import java.io.IOException;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prinCipal.chatbot.member.LoginRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class CustomAuthenticationFilter extends UsernamePasswordAuthenticationFilter{

	// 이 필터가 처리할 로그인 엔드포인트를 지정
	public CustomAuthenticationFilter(AuthenticationManager authenticationManager) {
        super(authenticationManager);
        // 기본 URL 오버라이드
        setFilterProcessesUrl("/api/login"); 
    }
	
	@Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {

        try {
            // HTTP 요청의 Body에서 JSON 데이터를 읽어 LoginRequest 객체로 변환
            LoginRequest loginRequest = new ObjectMapper().readValue(request.getInputStream(), LoginRequest.class);

            // AuthenticationManager에게 전달할 토큰 생성
            UsernamePasswordAuthenticationToken authRequest = new UsernamePasswordAuthenticationToken(
                    loginRequest.getNickname(), 
                    loginRequest.getPassword() 
            );
            
            // AuthenticationManager에게 인증 요청 (MemberDetailService의 loadUserByUsername 호출)
            return this.getAuthenticationManager().authenticate(authRequest);
            
        } catch (IOException e) {
            throw new RuntimeException("인증 요청 파싱 오류", e);
        }
    }
}
