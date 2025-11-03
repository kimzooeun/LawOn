package com.prinCipal.chatbot.oauth2;

import java.io.IOException;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class Oauth2AuthenticationFailureHandler implements AuthenticationFailureHandler {
	
	@Override
	public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException exception) throws IOException, ServletException {

		// String errorMessage  = "소셜 로그인 실패!!!!!";
		System.out.println("❌ OAuth2 실패 이유: " + exception.getMessage());
		// AuthenticationException : 시큐리티에서 정의한 인증 과정 중에 발생하는 모든 예외의 기본 클래스 
		// 현재 예외의 원인이 된 그 예외 자체를 리턴해주는 메서드 
//		if(exception.getCause() != null && exception.getMessage().contains("invalid_grant")) {
//			errorMessage += "원인 : " + exception.getCause().getMessage();
//		}
		

		//JSON 응답 (MSA API 서버용)
//        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
//        response.setContentType("application/json;charset=UTF-8");
//        
//        String jsonResponse = String.format(
//                "{" +
//                  "\"status\": \"fail\"," +
//                  "\"message\": \"%s\"" +
//                "}", errorMessage
//        );
        
        response.sendRedirect("http://localhost:3000/login_fail.html?error=auth_failed");


	}

}

