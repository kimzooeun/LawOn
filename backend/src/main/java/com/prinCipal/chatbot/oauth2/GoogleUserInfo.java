package com.prinCipal.chatbot.oauth2;

import java.util.Map;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class GoogleUserInfo implements SocialUserInfo {

	private final Map<String, Object> attributes;

	@Override
	public String getId() {
		return (String) attributes.get("sub");
	}

	@Override
	public String getName() {
		return (String) attributes.get("sub");
	}

	@Override
	public String getEmail() {
		return (String) attributes.get("sub");
	}

	@Override
	public String getProfileImageUrl() {
		return (String) attributes.get("sub");
	}
}
