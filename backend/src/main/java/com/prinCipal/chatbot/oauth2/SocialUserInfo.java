package com.prinCipal.chatbot.oauth2;

public interface SocialUserInfo {
	// SocialUserInfoFactory에서 각각 소셜 받아오면 
	// 여러 소셜 클래스에서 받아와서 쓰기 위해 인터페이스 생성 
	String getId();
    String getName();
    String getEmail();
    String getProfileImageUrl();
}
