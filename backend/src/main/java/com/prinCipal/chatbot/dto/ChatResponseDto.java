package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor 
public class ChatResponseDto {
    private String text;      // 프론트엔드가 받을 챗봇 응답
    private String sessionId; // 프론트엔드가 받을 세션 ID
}

