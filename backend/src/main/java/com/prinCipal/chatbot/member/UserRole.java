package com.prinCipal.chatbot.member;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserRole implements GrantedAuthority{
	USER("고객", "ROLE_USER"),
	ADMIN("관리자", "ROLE_ADMIN");
	
	private final String displayName;
	private final String authority;
	
	@Override
	public String getAuthority() {return authority;}
}

