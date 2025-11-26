package com.prinCipal.chatbot.member;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TokenResponse {
    private String status;
    private String message;
    private String accessToken;
}
