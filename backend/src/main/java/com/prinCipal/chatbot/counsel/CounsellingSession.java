package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.alert.CrisisAlert;
import com.prinCipal.chatbot.content.CounsellingContent;
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
@Getter
@NoArgsConstructor
@Table(name = "counselling_session")
public class CounsellingSession {

	// 세션 ID
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "session_id")
	private Long sessionId;

	// 사용자 ID
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private Member member;

	// 상담 시작, 상담 끝, 최근 메세지
	@CreationTimestamp
	@Column(name = "start_time", nullable = false)
	private LocalDateTime startTime;

	@Column(name = "end_time")
	private LocalDateTime endTime;

	@Column(name = "last_message_time")
	private LocalDateTime lastMessageTime;

	// 세션 길이
	@Formula("TIMESTAMPDIFF(SECOND,start_time,end_time)")
	@Column(name = "duration_sec", insertable = false, updatable = false)
	private Integer durationSec;

	// 상담 진행 상태 (시작, 중간, 종료)
	@Enumerated(EnumType.STRING)
	@Column(name = "completion_status")
	private CompletionStatus completionStatus = CompletionStatus.ONGOING;

	// 상담 제목
	@Column(name = "summary_title", columnDefinition = "TEXT")
	private String summaryTitle;

	// 상담 내용 요약
	@Column(columnDefinition = "TEXT")
	private String summary;

	// 세션 재개용 토큰
	@Column(name = "resume_token")
	private String resumeToken;

//	 // 세션 생성일
//	 @CreationTimestamp
//	 @Column(name = "created_at")
//	 private LocalDateTime createdAt;
//
//	 // 세션 수정일
//	 @UpdateTimestamp
//	 @Column(name = "updated_at")
//	 private LocalDateTime updatedAt;

	// 세선 1 : 발화 N 관계
	@OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<CounsellingContent> contents = new ArrayList<>();

	// 세션 1 : 감정 N 관계
	@OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<KeywordAnalysis> keywordAnalyses = new ArrayList<>();

	// 세션 1 : 위기알림 N 관계
	@OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<CrisisAlert> crisisAlerts = new ArrayList<>();

	@Builder
	public CounsellingSession(Member member, CompletionStatus completionStatus, String resumeToken) {
		this.member = member;
		this.completionStatus = completionStatus;
		this.lastMessageTime = LocalDateTime.now();
		this.resumeToken = resumeToken;
	}

	// 상담 진행 상태 업데이트
	public void updateStatus(CompletionStatus completionStatus) {
		this.completionStatus = completionStatus;
	}

	// 상담 제목 업데이트
	public void updateSummaryTitle(String summaryTitle) {
		this.summaryTitle = summaryTitle;
	}

	// 상담 내용 업데이트
	public void updateSummary(String summary) {
		this.summary = summary;
	}

	// 최근 메세지 시간 업데이트
	public void updateLastMessageTime(LocalDateTime lastMessageTime) {
		this.lastMessageTime = lastMessageTime;
	}

	// 상담 종료 업데이트
	public void updateendTime(LocalDateTime endTime) {
		this.endTime = endTime;
	}

}
