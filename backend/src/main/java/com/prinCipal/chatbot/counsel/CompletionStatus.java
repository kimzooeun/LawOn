package com.prinCipal.chatbot.counsel;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CompletionStatus {
	ONGOING("상담 진행중", "ONGOING"),
	PAUSED("상담 멈춤", "PAUSED"),
	COMPLETED("상담 종료", "COMPLETED"),
	TIMEOUT("시간 초과", "TIMEOUT"),
	CANCELLED("상담 취소","CANCELLED");
	
	private final String displayStatus;
	private final String status;
}
