package com.prinCipal.chatbot.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Data
public class LoginFailedException extends RuntimeException{

	private static final long serialVersionUID = 1L;
	private String message;
}
