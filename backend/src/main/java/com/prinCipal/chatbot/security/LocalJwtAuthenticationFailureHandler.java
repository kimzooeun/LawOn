package com.prinCipal.chatbot.security;


import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class LocalJwtAuthenticationFailureHandler implements AuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure( HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException {

    	response.setStatus(HttpServletResponse.SC_BAD_REQUEST);   // 400 오류
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

     

        Map<String, Object> body = new HashMap<>();
        body.put("message", "아이디 또는 비밀번호가 올바르지 않습니다.");

        new ObjectMapper().writeValue(response.getWriter(), body);
    }
}
