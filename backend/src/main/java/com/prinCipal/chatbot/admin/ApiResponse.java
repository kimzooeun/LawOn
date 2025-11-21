package com.prinCipal.chatbot.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
	private boolean success;
	private String message;
	private T data;

	public static <T> ApiResponse<T> success(T data) {
		return new ApiResponse<>(true, "성공", data);
	}

	public static <T> ApiResponse<T> success(String msg, T data) {
		return new ApiResponse<>(true, msg, data);
	}

	public static <T> ApiResponse<T> fail(String msg) {
		return new ApiResponse<>(false, msg, null);
	}
}
