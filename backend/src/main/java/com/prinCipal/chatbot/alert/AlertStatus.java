package com.prinCipal.chatbot.alert;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AlertStatus {
	PENDING("위기 감지", "PENDING"), 
	RESOLVED("대응 완료", "RESOLVED");

	private final String displayAlertStatus;
	private final String engAlertStatus;
}
