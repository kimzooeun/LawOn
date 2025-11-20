package com.prinCipal.chatbot.member;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignupRequest {

	private String nickname;
	
	private String password;
	
	private String confirmPassword;

}

