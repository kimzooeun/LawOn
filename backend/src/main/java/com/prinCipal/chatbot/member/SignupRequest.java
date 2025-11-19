package com.prinCipal.chatbot.member;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignupRequest {

	@NotBlank(message = "닉네임은 필수입니다")
	@Size(min =6, max = 20, message = "닉네임은 6-20자 사이여야 합니다.")
	private String nickname;
	
	@NotBlank(message = "비밀번호는 필수입니다.")
	@Size(min =8, max = 100, message = "비밀번호는 8자 이상이어야 합니다.")
	private String password;
	
	@NotBlank(message = "비밀번호 확인은 필수입니다.")
	private String confirmPassword;

}

