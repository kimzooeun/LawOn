package com.prinCipal.chatbot.oauth2;

import java.util.Map;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class GoogleUserInfo implements SocialUserInfo {

	private final Map<String, Object> attributes;

	@Override
	public String getId() {
		// 구글 고유 ID
		return (String) attributes.get("sub");
	}

	@Override
	public String getName() {
		// 사용자닉네임
		String nickname = (String) attributes.get("name");
		if(nickname ==null) {
			nickname = (String) attributes.get("given_name");
		}
		return nickname;
	}

	@Override
	public String getEmail() {
		return (String) attributes.get("email");
	}

	@Override
	public String getProfileImageUrl() {
		return (String) attributes.get("picture");
	}
}
