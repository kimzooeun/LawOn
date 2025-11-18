package com.prinCipal.chatbot.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

//1. 최상위 응답 DTO
@Data
@NoArgsConstructor
public class FastApiResponseDto {
	private KeywordAnalysisDto keywordAnalysis;
	private ChatbotResponseDto chatbotResponse;
	private SessionUpdatesDto sessionUpdates;
}
