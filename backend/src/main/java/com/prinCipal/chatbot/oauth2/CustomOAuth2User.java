package com.prinCipal.chatbot.oauth2;

import java.util.Collection;
import java.util.Map;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.prinCipal.chatbot.member.Member;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class CustomOAuth2User implements OAuth2User {

	private final Member member;
	private final Map<String, Object> attributes;
	private final String nameAttributeKey;
	private final Collection<? extends GrantedAuthority> authorities;
	
	@Override
	public Map<String, Object> getAttributes() {
		return attributes;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	// OAuth2 공급자(Kakao, Google 등)가 제공하는 고유 사용자 ID”를 반환
	@Override
	public String getName() {
		 return String.valueOf(attributes.get(nameAttributeKey));
	}
	
	public Member getMember() {
		return member;
	}
	
	public String getNickname() {
		return member.getNickname();
	}
	
	public String getProfileImageUrl() {
		return member.getProfileImageUrl();
	}

}
