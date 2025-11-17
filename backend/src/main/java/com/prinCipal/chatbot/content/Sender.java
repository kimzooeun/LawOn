package com.prinCipal.chatbot.content;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Sender {
	CHATBOT("챗봇","CHATBOT"),
	PERSON("사람", "PERSON");
	
	
	private final String displaySender;
	private final String sender;
	
}
