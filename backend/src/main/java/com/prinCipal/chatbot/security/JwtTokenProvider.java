package com.prinCipal.chatbot.security;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;

import jakarta.servlet.http.Cookie;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.prinCipal.chatbot.security.MemberDetailService;
import com.prinCipal.chatbot.counsel.SessionService;
import com.prinCipal.chatbot.exception.NotAuthenticatedException;
import com.prinCipal.chatbot.exception.TokenValidationException;
import com.prinCipal.chatbot.member.Member;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

//JWT 토큰 생성, 검증 , 파싱 등 JWT 관련 모든 작업 처리 
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {
	private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
	
	private final MemberDetailService memberDetailService;

	@Value("${jwt.secret-key}")
	private String SECRET_KEY;

	@Value("${jwt.access-token-validity:3600000}")
	private long ACCESS_TOKEN_VALIDITY;

	@Value("${jwt.refresh-token-days:2}")
	private int refreshDays;

	private SecretKey getSigningKey() {
		return Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
	}

	
	private RedisTemplate<String, String> redisTemplate;
	
	// Access Token 생성
	public String generateAccessToken(Authentication authentication) {
		Object principal = authentication.getPrincipal();
		String nickname;
		String authorities;

		long now = System.currentTimeMillis();
		Date validity = new Date(now + ACCESS_TOKEN_VALIDITY);

		if (principal instanceof Member member) {
			nickname = member.getNickname();
			authorities = member.getRole().getAuthority();
		} else if (principal instanceof User user) {
			nickname = user.getUsername();
			authorities = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
					.collect(Collectors.joining(","));
		} else if (principal instanceof String str) {
			nickname = str;
			authorities = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
					.collect(Collectors.joining(","));
		} else {
			throw new IllegalArgumentException("지원하지 않는 principal 타입: " + principal.getClass());
		}

		return Jwts.builder().id(UUID.randomUUID().toString()) // 토큰 고유 식별자 -> JTI 부여
				.subject(nickname).claim("auth", authorities).issuedAt(new Date()).expiration(validity)
				.signWith(this.getSigningKey()).compact();
	}

	// Refresh Token 생성 (별도 정보 없이 만료 시간만 길게)
	public String generateRefreshToken(Authentication authentication) {
		Object principal = authentication.getPrincipal();
		String nickname;
		String authorities;

		long now = System.currentTimeMillis();
		Date validity = new Date(now + refreshDays * 24L * 60 * 60 * 1000);

		if (principal instanceof Member member) {
			nickname = member.getNickname();
			authorities = member.getRole().getAuthority();
		} else if (principal instanceof User user) {
			nickname = user.getUsername();
			authorities = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
					.collect(Collectors.joining(","));
		} else if (principal instanceof String str) {
			nickname = str;
			authorities = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
					.collect(Collectors.joining(","));
		} else {
			throw new IllegalArgumentException("지원하지 않는 principal 타입: " + principal.getClass());
		}

		return Jwts.builder().id(UUID.randomUUID().toString()).subject(nickname).claim("auth", authorities)
				.issuedAt(new Date()).expiration(validity).signWith(this.getSigningKey()).compact();
	}

	// Jwt 토큰을 복호화하여 토큰에 들어있는 정보를 꺼내는 메서드
	public Authentication getAuthentication(String token) {
		// Claims는 토큰에 포함된 사용자 정보와 메타 데이터를 포함
		Claims claims = Jwts.parser().verifyWith(this.getSigningKey()).build().parseSignedClaims(token).getPayload();

		if (claims.getSubject() == null) {
			throw new AuthenticationCredentialsNotFoundException("JWT Claims 비어있음");
		}

		// 닉네임(subject)으로 MemberDetailService에서 실제 사용자 정보(알맹이)를 로드합니다.
		UserDetails principal = this.memberDetailService.loadUserByUsername(claims.getSubject());

		// 'principal.getAuthorities()'를 사용하도록 변경합니다.
		return new UsernamePasswordAuthenticationToken(principal, token, principal.getAuthorities());
	}

	// 토큰 정보를 검증하는 메서드 + 블랙 리스트 검사 까지 해야함. (탈퇴 후, accessToken 블랙리스트 처리 됐는데 검사를 안하니, 그냥 유효 통과됨) 
	public boolean validateToken(String token) {
		try {
			Claims claims = Jwts.parser().verifyWith(this.getSigningKey()).build().parseSignedClaims(token).getPayload();
			
			// jti 추출
			String jti  = claims.getId();
			
			// 블랙리스트 검사
			if(Boolean.TRUE.equals(redisTemplate.hasKey("BL: " + jti))) {
				logger.warn("블랙리스트 토큰 접근 차단 jti={}", jti);
				return false;
			}
			return true;
		} catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
			System.out.println("잘못된 JWT 시그니처에요");
		} catch (ExpiredJwtException e) {
			System.out.println("만료된 토큰이니 재발급이 필요해요");
			return false;
		} catch (UnsupportedJwtException e) {
			System.out.println("지원하지 않는 JWT 토큰입니다.");
		} catch (IllegalArgumentException e) {
			System.out.println("토큰 형식 틀렸어요");
		} catch (Exception e) {
			System.out.println("의문의 에러");
		}
		return false;
	}

	// Refresh Token이 곧 만료될지 체크해서, 필요하면 새 토큰을 발급할지 결정
	public boolean isRefreshTokenExpiringSoon(String refreshToken) {
		// JWT 토큰은 Payload에 exp 클레임이 있어서 만료 시간을 알 수있음
		try {
			Claims claims = Jwts.parser().verifyWith(this.getSigningKey()).build().parseSignedClaims(refreshToken)
					.getPayload(); // Payload에 실제 Claims 객체 포함

			Date expiration = claims.getExpiration();
			Date now = new Date();

			// 만료 1일 이내면 "곧 만료"로 판단
			long expired = 24 * 60 * 60 * 1000L;
			// true => 남은시간이 expired보다 작다 (곧 만료된다)
			// false => 남은시간이 expired보다 크다 (만료될려면 아직 멀었다)
			return expiration.getTime() - now.getTime() < expired;

		} catch (JwtException e) {
			// 토큰 파싱 실패시, 안전하게 true로 처리해 새로운 토큰 발급
			return true;
		}
	}

	public String getUsernameFromToken(String refreshToken) {
		return Jwts.parser().verifyWith(this.getSigningKey()).build().parseSignedClaims(refreshToken).getPayload()
				.getSubject(); // getSubject로 토큰 생성시 넣었던 사용자이름을 반환
	}

	// 쿠키에서 RefreshToken 추출
	public String resolveRefreshToken(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null)
			return null;
		for (Cookie cookie : cookies) {
			if ("refreshToken".equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}

	// 헤더에서 AccessToken 추출
	public String resolveAccessToken(HttpServletRequest request) {
		String bearer = request.getHeader("Authorization");
		if (bearer == null || !bearer.startsWith("Bearer ")) {
			throw new NotAuthenticatedException("토큰이 없습니다.");
		}
		return bearer.substring(7);
	}

	// 만료된 토큰이여도, 서명을 검증하고 클레임 반환
	public Claims parseClaimsAllowExpired(String accessToken) {
		try {
			// 토큰 -> 서명 검증 + 만료 체크
			return Jwts.parser().verifyWith(this.getSigningKey()).build().parseSignedClaims(accessToken).getPayload(); // Payload에
																														// 실제
																										// 포함
		} catch (ExpiredJwtException e) {
			// 토큰은 만료됐지만, 서명은 유효해서 e안의 claims을 꺼내서 사용은 가능
			return e.getClaims();
		} catch (UnsupportedJwtException e) {
			throw new TokenValidationException("지원되지 않는 토큰 형식입니다.");
		} catch (MalformedJwtException e) {
			throw new TokenValidationException("잘못된 토큰 형식입니다.");
		} catch (SignatureException e) {
			throw new TokenValidationException("시그니처가 유효하지 않습니다.");
		} catch (IllegalArgumentException e) {
			throw new TokenValidationException("토큰이 비어있습니다.");
		}
	}

	// accessToken의 남은 TTL (초 단위)
	public long getRemainingTtlSeconds(String accessToken) {
		Claims claims = parseClaimsAllowExpired(accessToken);
		Date expiration = claims.getExpiration();
		if (expiration == null)
			return 0;
		long remainTtl = expiration.getTime() - System.currentTimeMillis();
		return Math.max(remainTtl / 1000, 0); // 남은 ttl을 초단위로 계산하되, 음수가 되면 0으로 처리
	}

}
