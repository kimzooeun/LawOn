package com.prinCipal.chatbot.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = false)
@AllArgsConstructor
@NoArgsConstructor
public class TokenValidationException extends RuntimeException{

	private static final long serialVersionUID = 1L;
	private String message;

}
