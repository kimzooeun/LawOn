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
@Getter
@NoArgsConstructor
@Table(name = "users")
public class Member {
	
	@Id 
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "user_id")
	private Long userId;
	
	@Column(nullable=false, unique =true)
	private String nickname;     
	
	@Column(name = "display_name", nullable=false)
	private String displayName;
	
	@Column(nullable=false)
	private String password;
	
	@Enumerated(EnumType.STRING)
	@Column(name = "user_role", nullable = false)
	private UserRole role;

	@CreationTimestamp
	@Column(name = "created_at")
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
	
	
	@OneToMany(mappedBy = "member",cascade=CascadeType.ALL, orphanRemoval=false)
	private List<CounsellingSession> sessions = new ArrayList<>();

	@OneToMany(mappedBy = "member",cascade=CascadeType.ALL, orphanRemoval=false)
	private List<CrisisAlert> crisisAlerts = new ArrayList<>();
	
	@Builder
	public Member(String nickname, String displayName, String password, UserRole role, String socialProvider, 
			String socialId, String profileImageUrl) {
		this.nickname = nickname;
		this.displayName = displayName;
		this.password = password;
		this.role = role; 
		this.socialProvider = (socialProvider != null) ? socialProvider : "local";
		this.socialId = socialId;
		this.profileImageUrl = profileImageUrl;
	}
	

	// ----- 소셜 로그인 정보 ------ 
	@Column(name = "social_provider", length=50)
	private String socialProvider;  // ex) "google", "kakao" 소셜 제공자 
	
	@Column(name = "social_id", unique = true)
	private String socialId;  // socialProvider가 제공하는 고유 id
	
	@Column(name = "profile_image_url")
	private String profileImageUrl;  // 프로필 이미지 url
	
  // 소셜 로그인 시 기존 회원 정보 업데이트
  // 구글쪽 이미지랑 연관시키고 싶으면 필요한 업데이트 메소드 
  public void updateSocialInfo(String newDisplayName, String newProfileImageUrl) {
    if (newDisplayName != null && !newDisplayName.isBlank()) {
          this.displayName = newDisplayName; 
      }
    if (newProfileImageUrl != null && !newProfileImageUrl.isBlank()) {
          this.profileImageUrl = newProfileImageUrl;
      }
    this.updatedAt = LocalDateTime.now();
  }

  // 닉네임 변경 
  public void updatedisplayName(String displayName) {
    this.displayName = displayName;
    this.updatedAt = LocalDateTime.now();
  }

  // 비밀번호 변경 메소드 추가
  public void updatePassword(String newPassword) {
    this.password = newPassword;
    this.updatedAt = LocalDateTime.now();
  }
}
