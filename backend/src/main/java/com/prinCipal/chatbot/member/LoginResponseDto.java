package com.prinCipal.chatbot.member;

import lombok.Getter;

@Getter
public class LoginResponseDto {
    private String accessToken;
    private Long userId;
    private String nickname;

    public LoginResponseDto(String accessToken, Long userId, String nickname) {
        this.accessToken = accessToken;
        this.userId = userId;
        this.nickname = nickname;
    }
}