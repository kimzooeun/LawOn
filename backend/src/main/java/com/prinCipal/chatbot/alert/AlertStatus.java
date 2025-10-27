package com.prinCipal.chatbot.alert;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AlertStatus {
	PENDING("아직 확인전","PENDING"),
	IN_REVIEW("담당자가 확인중","IN_REVIEW"),
	ESCALATED("상위 담당자에게 전달","ESCALATED"),
	RESOLVED("대응 완료","RESOLVED"),
	CANCELLED("무효처리", "CANCELLED");
	
	private final String displayAlertStatus;
	private final String engAlertStatus;
}
