package com.prinCipal.chatbot.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class RedisConnectionTest implements CommandLineRunner {

    private final org.springframework.data.redis.connection.RedisConnectionFactory redisConnectionFactory;

    @Override
    public void run(String... args) {
        try (var connection = redisConnectionFactory.getConnection()) {
            connection.ping();
            System.out.println("Redis 연결 성공!");
        } catch (Exception e) {
            System.out.println("Redis 연결 실패!");
            e.printStackTrace();
        }
    }
}

