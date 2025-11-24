package com.prinCipal.chatbot.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	// 유효성 검사 오류 처리 위함
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException e) {
		Map<String, String> errors = new HashMap<>();
		e.getBindingResult().getFieldErrors().forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
		Map<String, Object> body = new HashMap<>();
		body.put("status", 400);
		body.put("errors", errors);

		return ResponseEntity.badRequest().body(body);

	}

	// 회원가입시 , 유효성 검사 오류 처리 위함
	@ExceptionHandler(SignupValidationException.class)
	public ResponseEntity<?> handleSignupValidation(SignupValidationException e) {
		return ResponseEntity.badRequest().body(Map.of("status", "fail", "message", "검증 실패", "errors", e.getErrors()));
	}

	// 로그인 오류 처리
	@ExceptionHandler(LoginFailedException.class)
	public ResponseEntity<?> handleLoginFailed(LoginFailedException e) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("status", "fail", "message", e.getMessage()));
	}

	// authentication 없을때 오류 처리
	@ExceptionHandler(NotAuthenticatedException.class)
	public ResponseEntity<?> handleAuthenticated(NotAuthenticatedException e) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("status", "fail", "message", e.getMessage()));
	}

	// 토큰 유효성 검사 오류 처리
	@ExceptionHandler(TokenValidationException.class)
	public ResponseEntity<?> handleTokenValidation(TokenValidationException e) {
		return ResponseEntity.badRequest().body(Map.of("status", "fail", "message", e.getMessage()));
	}

	// 비밀번호 정책 위반 시 (IllegalArgumentException)
	// (400 Bad Request: 사용자의 요청이 잘못됨)

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException e) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST) // 400
				.body(Map.of("status", "fail", "message", e.getMessage()));
	}

	// 권한 없음(403 Forbidden)
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<Map<String, String>> handleAccessDeniedException(AccessDeniedException e) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("status", "fail", "message", e.getMessage()));
	}

	// 예상치 못한 모든 서버 오류 처리 (Exception)
	// (500 Internal Server Error: 서버 내부 오류)

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, String>> handleGeneralException(Exception e) {
		// log.error("예상치 못한 오류", e);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR) // 500
				.body(Map.of("status", "error", "message", "요청 처리 중 오류가 발생했습니다."));
	}

}
