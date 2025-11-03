package com.prinCipal.chatbot.member;

import lombok.Getter;

@Getter
public class MemberProfileDto {
	  private final String nickname;
	    // private final String email;
	    private final String profileImage;
	    private final String socialId; 
	    private final String provider;

	    // 엔티티를 받아서 DTO를 생성하는 생성자
	    public MemberProfileDto(Member member) {
	        this.nickname = member.getNickname();
	        this.profileImage = member.getProfileImageUrl();
	       this.socialId = member.getSocialId(); // member에 소셜 ID 필드가 있다고 가정
	       this.provider = member.getSocialProvider();
	    }

}
