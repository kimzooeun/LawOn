package com.prinCipal.chatbot.oauth2;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberService;
import com.prinCipal.chatbot.security.CookieHeader;
import com.prinCipal.chatbot.security.JwtTokenProvider;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class Oauth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler{

	private final JwtTokenProvider jwtTokenProvider;
	private final MemberService memberService;
	private final CookieHeader cookieHeader;
	
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
		
		// JSON으로 성공 응답
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json;charset=UTF-8");

     
        // JSON 메시지 구성
        String jsonResponse = String.format(
            "{" +
                "\"status\": \"success\"," +
                "\"message\": \"소셜 로그인 성공\"," +
                "\"nickname\": \"%s\"," +
                "\"provider\": \"%s\"," +
                "\"accessToken\": \"%s\"" +
            "}",
            member.getNickname(),
            member.getSocialProvider(),
            accessToken
        );
        
        response.getWriter().write(jsonResponse);
        
//	   String targetUrl = UriComponentsBuilder.fromUriString("/oauth2-success")
//                .build().toUriString();
//        getRedirectStrategy().sendRedirect(request, response, targetUrl);
		
        // 중간 페이지 없이 바로 최종 목적지로 리다이렉트
        // String targetUrl = "/home"; // Thymeleaf 페이지를 보여줄 컨트롤러 URL
        // getRedirectStrategy().sendRedirect(request, response, targetUrl);
		
	}
}
