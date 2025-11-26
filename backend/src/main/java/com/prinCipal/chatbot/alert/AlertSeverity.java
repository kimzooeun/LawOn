package com.prinCipal.chatbot.alert;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AlertSeverity {
	LOW("낮음", "LOW"), 
	MEDIUM("중간", "MEDIUM"), 
	HIGH("높음", "HIGH"), 
	CRITICAL("비상", "DANGER");

	private final String displaySeverity;
	private final String engSeverity;
}
