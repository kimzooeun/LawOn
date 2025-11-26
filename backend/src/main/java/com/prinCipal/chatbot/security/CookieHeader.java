package com.prinCipal.chatbot.security;

import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletResponse;

@Component
public class CookieHeader {

	@Value("${jwt.refresh-token-days}")
	private int refreshDays;
	
	
	public void SendCookieWithRefreshToken(HttpServletResponse response,String refreshToken) {
		long now = System.currentTimeMillis();
		Date validity = new Date(now + refreshDays * 24L * 60 * 60 * 1000);
		long maxAgeSeconds = (validity.getTime() - System.currentTimeMillis()) / 1000;
		ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
											.httpOnly(true)  // js 접근 불가
											.secure(false)  // 개발단계에서는 false
											.path("/")      // 모든 경로에서 전송
											.maxAge((int) maxAgeSeconds)
											.sameSite("Lax")   // CSRF 방어, 필요 시 "Lax" 또는 "Strict"
											.build();
		
		response.addHeader("Set-Cookie", cookie.toString());   // 응답 헤더에 쿠키 추가 
	}
	
	public void clearRefreshCookie(HttpServletResponse response) {
		// 즉시 만료되는 쿠키를 설정
		ResponseCookie expiredCookie = ResponseCookie.from("refreshToken", "")
				.httpOnly(true)
				.secure(false)
				.path("/")
				.maxAge(0)
				.sameSite("Lax")
				.build();
		
		response.addHeader("Set-Cookie", expiredCookie.toString());
	}
}
