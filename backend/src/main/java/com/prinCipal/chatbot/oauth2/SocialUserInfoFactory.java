package com.prinCipal.chatbot.oauth2;

import java.util.Map;

public class SocialUserInfoFactory {
	// 여러 소셜에서 쏴주는 것이 다르기 때문에 
	// 어떤 소셜(String으로 들어옴) 인지와 사용자 정보(맵타입) 를 파라미터로 받아옴
	
	public static SocialUserInfo getSocialUserInfo(String registId, Map<String, Object> attributes, String accessToken) {
		switch(registId.toLowerCase()) {
			case "google":{
				return new GoogleUserInfo(attributes);
			}
			
			case "kakao" : {
				return new KaKaoUserInfo(attributes, accessToken);
			}
			
			default : 
				throw new IllegalArgumentException("예상치 못한 소셜 : " + registId);
		}
	}
}
