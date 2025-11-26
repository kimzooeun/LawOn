package com.prinCipal.chatbot.security;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;


// 로그아웃된 토큰 또는 강제로 만료된 토큰을 Redis에 저장해두는 목록
// 이 토큰을 다시 써서 접근할려고 하면 인증 거부(401) 해야함
@Repository
@RequiredArgsConstructor
public class BlackTokenRepository {
	private final StringRedisTemplate redisTemplate;
	
	// Redis에 로그아웃한 accessToken를 ttl동안 블랙리스트 등록
	public void block(String jti, long ttlSeconds) {
		if(jti == null || ttlSeconds <= 0) return;
		ValueOperations<String, String> ops = this.redisTemplate.opsForValue();
		ops.set("BL:" + jti, "1", Duration.ofSeconds(ttlSeconds));  // 1은 단순히 이 키 존재함, 블랙리스트에 등록됨을 말함 
	}

	public boolean isBlocked(String jti) {
		return Boolean.TRUE.equals(this.redisTemplate.hasKey("BL:" + jti));
	}
}
