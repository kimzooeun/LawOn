package com.prinCipal.chatbot.oauth2;

import java.util.Map;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class NaverUserInfo implements SocialUserInfo{
	
	private final Map<String, Object> attributes;
	
	
	@SuppressWarnings("unchecked")
	@Override
	public String getId() {
		Map<String, Object> response = (Map<String, Object>) attributes.get("response");
		return (String) response.get("id");
	}

	@SuppressWarnings("unchecked")
	@Override
	public String getName() {
		return ((Map<String, Object>) attributes.get("response")).get("nickname").toString();
	}

	@SuppressWarnings("unchecked")
	@Override
	public String getEmail() {
		return ((Map<String, Object>) attributes.get("response")).get("email").toString();
	}

	@SuppressWarnings("unchecked")
	@Override
	public String getProfileImageUrl() {
		Map<String, Object> response = (Map<String, Object>) attributes.get("response");
		Object img = response.get("profile_image");
		return img != null ? img.toString() : null;
	}
	
}
