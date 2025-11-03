package com.prinCipal.chatbot.member;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.alert.CrisisAlert;
import com.prinCipal.chatbot.counsel.CounsellingSession;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
@Table(name = "users")
public class Member {
	
	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long userId;
	
	@Column(nullable=false, unique =true)
	private String nickname;
	
	
	@Column(nullable=false)
	private String password;
	
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private UserRole role;


	@CreationTimestamp
	private LocalDateTime createdAt;

	@UpdateTimestamp
	private LocalDateTime updatedAt;
	
	
	@OneToMany(mappedBy = "member",cascade=CascadeType.ALL, orphanRemoval=false)
	private List<CounsellingSession> sessions = new ArrayList<>();

	
	@OneToMany(mappedBy = "member",cascade=CascadeType.ALL, orphanRemoval=false)
	private List<CrisisAlert> crisisAlerts = new ArrayList<>();
	
	@Builder
	public Member(String nickname, String password, UserRole role, String socialProvider, 
			String socialId, String profileImageUrl) {
		this.nickname = nickname;
		this.password = password;
		this.role = role; 
		this.socialProvider = socialProvider;
		this.socialId = socialId;
		this.profileImageUrl = profileImageUrl;
	}
	

	// ----- 소셜 로그인 정보 ------ 
	@Column(length=50)
	private String socialProvider;  // ex) "google", "kakao" 소셜 제공자 
	
	@Column(unique = true)
	private String socialId;  // socialProvider가 제공하는 고유 id
	
	@Column
	private String profileImageUrl;  // 프로필 이미지 url
	
	
	
    // 소셜 로그인 시 기존 회원 정보 업데이트
    // 구글쪽 이미지랑 연관시키고 싶으면 필요한 업데이트 메소드 
    public void updateSocialInfo(String newNickname, String newProfileImageUrl) {
    	if (newNickname != null && !newNickname.isBlank()) {
            this.nickname = newNickname; // optional (닉네임 동기화 원하면)
        }
    	if (newProfileImageUrl != null && !newProfileImageUrl.isBlank()) {
            this.profileImageUrl = newProfileImageUrl;
        }
    	this.updatedAt = LocalDateTime.now();
    }
	
	
}
