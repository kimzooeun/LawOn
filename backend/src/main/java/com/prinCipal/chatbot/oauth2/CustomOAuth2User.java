package com.prinCipal.chatbot.oauth2;

import java.util.Collection;
import java.util.Map;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.prinCipal.chatbot.member.Member;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class CustomOAuth2User implements OAuth2User, UserDetails{
	// 모든 로그인 방식을 통합하기 위해, CustomUser 내부에서 어떤 방식으로 로그인했든 Member를 품고 있도록 설계
	private final Member member;
	private final Map<String, Object> attributes;
	private final String nameAttributeKey;
	private final Collection<? extends GrantedAuthority> authorities;
	private String social_accessToken;   // 소셜 로그인용 토큰 (일반 로그인은 null)
	
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

	@Override
	public String getPassword() {
		return member.getPassword();
	}

	@Override
	public String getUsername() {
		return member.getNickname();
	}
	
	public String getSocial_accessToken() {
		return social_accessToken;
	}
	

	public void setSocialAccessToken(String socialAccessToken) {
		social_accessToken = socialAccessToken;
	}


}
