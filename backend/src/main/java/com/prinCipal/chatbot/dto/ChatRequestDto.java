package com.prinCipal.chatbot.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter 
@NoArgsConstructor
public class ChatRequestDto {
	private Long sessionId;
    private String userMessage; // 프론트가 보낸 메시지
}
