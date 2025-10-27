package com.prinCipal.chatbot.alert;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AlertSeverity {
	LOW("심각도 낮음","LOW"),
	MEDIUM("심각도 중간","MEDIUM"),
	HIGH("심각도 높음","HIGH"),
	CRITICAL("비상","CRITICAL");
	
	private final String displaySeverity;
	private final String engSeverity;
}
