package com.prinCipal.chatbot.exception;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class SignupValidationException extends RuntimeException{

	private static final long serialVersionUID = 1L;
	
	private Map<String, String> errors;

}
