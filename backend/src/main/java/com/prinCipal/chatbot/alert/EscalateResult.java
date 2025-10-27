package com.prinCipal.chatbot.alert;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum EscalateResult {
	SUCCESS("전달 성공","SUCCESS"),
	FAILED("전달 실패", "FAILED"),
	TIMEOUT("전달 시간 초과", "TIMEOUT");
	
	private final String displayEscalateResult;
	private final String engEscalateResult;
}