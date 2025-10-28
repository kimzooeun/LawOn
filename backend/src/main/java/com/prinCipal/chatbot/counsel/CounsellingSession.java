package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.alert.CrisisAlert;
import com.prinCipal.chatbot.member.Member;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name="CounsellingSession")
@Getter
@NoArgsConstructor
public class CounsellingSession {

	 @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	 private Long sessionId;
	 
	 @ManyToOne(fetch = FetchType.LAZY)
	 @JoinColumn(name="user_id")
	 private Member member;
	 
	 @Column(nullable = false)
	 private LocalDateTime startTime;
	 
	 private LocalDateTime endTime;
	 private LocalDateTime lastMessageTime;
	 
	 
	 @Formula("TIMESTAMPDIFF(SECOND,start_time,end_time)")
	 private Integer durationSec;
	 
	 @Enumerated(EnumType.STRING)
	 private CompletionStatus completionStatus = CompletionStatus.ONGOING;
	 
	 @Column(columnDefinition = "TEXT")
	 private String summary;
	 
	 
	 private String resumeToken;
	 
	 
	 @Column(columnDefinition = "JSON")
	 private String contextSnapshot;
	 
	 @CreationTimestamp
	 private LocalDateTime createdAt;

	 @UpdateTimestamp
	 private LocalDateTime updatedAt;
	 
	
	 @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
	 private List<CounsellingContent> contents = new ArrayList<>();
	 
	 @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
	 private List<EmotionAnalysis> emotionAnalyses = new ArrayList<>();
	 
	 @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
	 private List<CrisisAlert> crisisAlerts = new ArrayList<>();
	 
	 @Builder
	 public CounsellingSession(Member member,CompletionStatus completionStatus,String summary,String resumeToken,String contextSnapshot) {
		 this.member = member;
		 this.completionStatus = completionStatus;
		 this.summary = summary;
		 this.contextSnapshot =contextSnapshot;
		 this.resumeToken = resumeToken;
	}
	
	 public void updateStatus(CompletionStatus completionStatus) {
		 this.completionStatus = completionStatus;
	 }
	 
	 
	 
}








