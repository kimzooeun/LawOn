package com.prinCipal.chatbot.oauth2;

import java.util.Collection;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.prinCipal.chatbot.member.Member;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class CutomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User>{
	
	// OAuth2Userservice : 소셜 로그인 구현시 사용자 정보를 가져오고 처리하는 핵심 인터페이스 
	// 파라미터를 2개를 받는 것을 무조건 원칙으로 함 
	
	// OAuth2UserRequest : OAuth2 공급자로부터 받은 액세스 토큰과 클라이언트 정보를 포함하는 요청과 관련된 객체
	// OAuth2User : OAuth2 공급자로부터 가져온 인증된 사용자의 정보를 나타내는 객체
	// 				-> 사용자의 이름, 이메일 등의 속성들을 포함
	
	private final SocialUserService socialUserService;
	
	@Override
	public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
	
		DefaultOAuth2UserService defaultService = new DefaultOAuth2UserService();
		
		OAuth2User oauth2User =  defaultService.loadUser(userRequest);
		
		// getRegistrationId() : 현재 로그인을 시도하는 OAuth2 서비스 제공자를 식별하는 고유한 ID(어떤소셜로그인 서비스인지 구분 가능) 
		String registId = userRequest.getClientRegistration().getRegistrationId();
		
		String userNameAttributeName = userRequest.getClientRegistration().getProviderDetails()
											.getUserInfoEndpoint().getUserNameAttributeName();
		// OAuth2 공급자(Kakao, Google 등)가 제공하는 고유 사용자 ID”를 반환
		// getUserNameAttributeName() : OAuth2 공급자가 사용자를 식별하는 키값. 
		// Google : "sub"
		// KaKao  : "id"
		// Naver : "response" 
		
		// 소셜 사용자 정보 통합 처리
		SocialUserInfo socialUserinfo = SocialUserInfoFactory.getSocialUserInfo(registId, oauth2User.getAttributes());
		
		// 회원 정보 저장 or 업데이트
		Member member = this.socialUserService.saveOrUpdateSocialMember(socialUserinfo, registId);
		
		Collection<GrantedAuthority> authorities = Stream.of(member.getRole())
													.map(role -> new SimpleGrantedAuthority(role.getAuthority()))
													.collect(Collectors.toSet());
		
		// CustomOAuth2User 객체를 생성한 후 리턴
		return new CustomOAuth2User(member, oauth2User.getAttributes(), userNameAttributeName, authorities);
	}

}












