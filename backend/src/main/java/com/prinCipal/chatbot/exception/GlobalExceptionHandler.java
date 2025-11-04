package com.prinCipal.chatbot.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

		// 유효성 검사 오류 처리 위함
		@ExceptionHandler(MethodArgumentNotValidException.class)
	    public  ResponseEntity<?>  handleValidationExceptions(MethodArgumentNotValidException e) {
	        Map<String, String> errors = new HashMap<>();
	        e.getBindingResult().getFieldErrors()
	          .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
	        return ResponseEntity.badRequest().body(Map.of(
		            "status", "fail",
		            "message", "검증 실패",
		            "errors", errors
		        ));
	    }
		
		// 유효성 검사 오류 처리 위함
	    @ExceptionHandler(SignupValidationException.class)
	    public ResponseEntity<?> handleSignupValidation(SignupValidationException e) {
	        return ResponseEntity.badRequest().body(Map.of(
	            "status", "fail",
	            "message", "검증 실패",
	            "errors", e.getErrors()
	        ));
	    }
	    
	    // 로그인 오류 처리 
	    @ExceptionHandler(LoginFailedException.class)
	    public ResponseEntity<?> handleLoginFailed(LoginFailedException e) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
	            "status", "fail",
	            "message", e.getMessage() 
	        ));
	    }
	    
	    
	    // authentication 없을때 오류 처리 
	    @ExceptionHandler(NotAuthenticatedException.class)
	    public ResponseEntity<?>  handleAuthenticated(NotAuthenticatedException e){
	    	return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
	    			"status" , "fail",
	    			"message", e.getMessage()
	    	));
	    }
	    
	    // 토큰 유효성 검사 오류 처리
	    @ExceptionHandler(TokenValidationException.class)
	    public ResponseEntity<?> handleTokenValidation(TokenValidationException e){
	    	return ResponseEntity.badRequest().body(Map.of(
	    			"status", "fail",
	    			"message", e.getMessage()
	    			));
	    }

}
