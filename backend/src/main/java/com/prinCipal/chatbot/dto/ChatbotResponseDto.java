package com.prinCipal.chatbot.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor 
public class ChatbotResponseDto {
	private String content;
	private String sender;
}
