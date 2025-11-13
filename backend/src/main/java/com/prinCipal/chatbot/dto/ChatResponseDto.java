package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor // 생성자 자동 생성
@NoArgsConstructor
public class ChatResponseDto {
    private String text; // FastAPI가 준 답변
    private String sessionId;
}
