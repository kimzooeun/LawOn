package com.prinCipal.chatbot.oauth2;

import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class KaKaoUserInfo implements SocialUserInfo {

	private final Map<String, Object> attributes;
	private final String accessToken;
	
	
	@Override
	public String getId() {
		return String.valueOf(attributes.get("id"));
	}

	@Override
	@SuppressWarnings("unchecked")
	public String getName() {
		Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
		if(properties == null) return "카카오 사용자";
		return (String) properties.get("nickname");
	}

	@Override
	@SuppressWarnings("unchecked")
	public String getEmail() {
		Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
		if(kakaoAccount == null) return null;
		return (String) kakaoAccount.get("email");
	}

	
	@Override
	@SuppressWarnings("unchecked")
	public String getProfileImageUrl() {
		Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
		if(properties == null) return null;
		return (String) properties.get("profile_image");
	}
}










