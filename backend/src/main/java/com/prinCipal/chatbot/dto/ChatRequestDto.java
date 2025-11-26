package com.prinCipal.chatbot.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter 
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatRequestDto {
	private Long sessionId;
    private String userMessage; // 프론트가 보낸 메시지
}
