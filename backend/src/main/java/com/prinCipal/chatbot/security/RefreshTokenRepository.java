package com.prinCipal.chatbot.security;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepository {
	private final StringRedisTemplate redisTemplate;
	
	
	public void save(String key, String refreshToken, long days) {
		ValueOperations<String, String> ops = this.redisTemplate.opsForValue();
		ops.set(key,refreshToken, Duration.ofDays(days)); 
	}
	
	
	public String findByKey(String key) {
		return this.redisTemplate.opsForValue().get(key);
	}
	
	public void delete(String key) {
		this.redisTemplate.delete(key);
	}
	
	public boolean exists(String key) {
		return Boolean.TRUE.equals(this.redisTemplate.hasKey(key));
	}
}
