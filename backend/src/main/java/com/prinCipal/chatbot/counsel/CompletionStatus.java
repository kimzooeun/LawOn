package com.prinCipal.chatbot.counsel;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CompletionStatus {
	ONGOING("상담 진행", "ONGOING"), 
	COMPLETED("상담 종료", "COMPLETED"), 
	TIMEOUT("시간 초과", "TIMEOUT");

	private final String displayStatus;
	private final String status;
}
