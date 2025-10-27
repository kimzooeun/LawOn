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
@Table(name="Users")
@NoArgsConstructor
@Getter
public class Member {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long userId;
	
	@Column(nullable=false,length=100, unique =true)
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
	private List<VoiceInteraction> voiceInteractions = new ArrayList<>();
	
	@OneToMany(mappedBy = "member",cascade=CascadeType.ALL, orphanRemoval=false)
	private List<CrisisAlert> crisisAlerts = new ArrayList<>();
	
	@Builder
	public Member(String nickname, String password, UserRole role) {
		this.nickname = nickname;
		this.password = password;
		this.role = role;
	}
}
