package com.prinCipal.chatbot.security;

import java.io.IOException;
import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.prinCipal.chatbot.member.MemberService;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

// 클라이언트에서 요청이 들어온 경우 
// 등록한 JwtAuthenticationFilter가 동작하여 해당 요청의 토큰 유효성을 검사
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter{
	public static final String AUTHORIZATION_HEADER = "Authorization";
	public static final String BEARER_PREFIX = "Bearer ";
	private final AntPathMatcher pathMatcher = new AntPathMatcher();
	
	private final JwtTokenProvider jwtTokenProvider;
	private final MemberService memberService;
	private final BlackTokenRepository blackTokenRepository;
	private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
	
	
	// 공개 경로는 JWT 인증 스킵
	// 인증이 필요없는 경로들
	private static final String[] PERMIT_URL = {
		    "/auth/signup", "/auth/login", "/auth/refresh", "/api/auth/login","/api/login",
		    "/oauth2/","login/oauth2/",
		    "/css/**", "/js/**", "/images/**", "/favicon.ico" // 정적 파일
		};

    // 모든 HTTP 요청이 이 필터를 거쳐가게 될거임 .. 
    // 요청을 거쳐가면서 토큰을 추출해 제대로된 토큰인지 아닌지 검사....
	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		
		String requestURI = request.getRequestURI();
		
		// 인증 불필요한 경로라면 그냥 필터 통과 (공개 경로는 JWT 인증 스킵)
	    if (isPermitPath(requestURI)) {
	        filterChain.doFilter(request, response);
	        return;
	    }
	    

	    //  토큰 추출 및 검증
		String jwt = resolveToken(request);
	
		if(StringUtils.hasText(jwt)) {
			Claims claims = this.jwtTokenProvider.parseClaimsAllowExpired(jwt);
			// 블랙리스트에 있는지 확인
			if(this.blackTokenRepository.isBlocked(claims.getId())) {
				// 블랙리스트에 있다 => 로그아웃된 사용자
				response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);  //  블랙리스트 차단 응답 401
				response.setContentType("application/json;charset=UTF-8");
				response.getWriter().write("{\"status\":\"fail\", \"message\":\"로그아웃된 토큰입니다.\"}");
				return; 
			}
			
			boolean isValid = this.jwtTokenProvider.validateToken(jwt);
			System.out.println("✅ AccessToken 유효성 결과: " + isValid);

			if(this.jwtTokenProvider.validateToken(jwt)) {
				System.out.println("🟢 AccessToken 유효함 → 인증 세팅");
				Authentication auth = this.jwtTokenProvider.getAuthentication(jwt);
				SecurityContextHolder.getContext().setAuthentication(auth);
			} else {
				System.out.println("🟡 AccessToken 만료 → RefreshToken 검사 시작");
				// Access Token 만료 → 쿠키에서 Refresh Token 확인
				String refreshToken = null;
				if(request.getCookies() != null) {   // HttpOnly 쿠키에서 토큰 확인
					for(Cookie cookie : request.getCookies()) {
						if("refreshToken".equals(cookie.getName())) {
							refreshToken = cookie.getValue(); 
						}
					}
				}
				
				
				if(StringUtils.hasText(refreshToken) && this.jwtTokenProvider.validateToken(refreshToken)) {
					// RefreshToken으로 새 AccessToken 발급
					String newAccessToken = this.memberService.newAccessToken(refreshToken, response);
					
					Authentication auth = this.jwtTokenProvider.getAuthentication(newAccessToken);
					SecurityContextHolder.getContext().setAuthentication(auth);
					
					// 새로 발급받은 토큰을 클라이언트에 전달
					response.setHeader("Authorization", "Bearer " + newAccessToken);
				
				}
			}
		}
		// 응답이 이미 커밋된 경우엔 다음 필터로 넘기지 않음
		if(!response.isCommitted()) {
			// 요청을 다음 Spring Security 내부 필터들로 항상 넘김
			filterChain.doFilter(request, response);
		}
	}

	
	private String resolveToken(HttpServletRequest request) {
		String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
		
		if(StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
			return bearerToken.substring(BEARER_PREFIX.length());
		}
	
		return null;
	}
	
	
	private boolean isPermitPath(String uri) {
	    return Arrays.stream(PERMIT_URL)
	                 .anyMatch(pattern -> pathMatcher.match(pattern, uri));
	}

}
