package com.prinCipal.chatbot.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class NotAuthenticatedException extends RuntimeException {

	private static final long serialVersionUID = 1L;
	private String message;
}
