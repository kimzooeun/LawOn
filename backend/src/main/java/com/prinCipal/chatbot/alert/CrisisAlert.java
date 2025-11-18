package com.prinCipal.chatbot.alert;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.counsel.CounsellingSession;
import com.prinCipal.chatbot.counsel.KeywordAnalysis;
import com.prinCipal.chatbot.member.Member;

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
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "crisis_alert")
public class CrisisAlert {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "alert_id")
	private Long alertId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private Member member;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "session_id")
	private CounsellingSession session;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "analysis_id")
	private KeywordAnalysis analysis;

	@Enumerated(EnumType.STRING)
	@Column(name = "alert_severity", nullable = false)
	private AlertSeverity alertSeverity = AlertSeverity.LOW;

	@Enumerated(EnumType.STRING)
	@Column(name = "alert_status")
	private AlertStatus alertStatus = AlertStatus.PENDING;

	@CreationTimestamp
	@Column(name = "created_at")
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@Builder
	public CrisisAlert(Member member, CounsellingSession session, KeywordAnalysis analysis, 
			AlertSeverity alertSeverity, AlertStatus alertStatus) {
		this.member = member;
		this.session = session;
		this.analysis = analysis;
		this.alertSeverity = alertSeverity;
		this.alertStatus = alertStatus;
	}

	// 위기 대응 상태 업데이트
	public void updateStatus(AlertStatus alertStatus) {
		this.alertStatus = alertStatus;
	}

	// 위기 심각도 업데이트
	public void updateSeverity(AlertSeverity alertSeverity) {
		this.alertSeverity = alertSeverity;
	}

}
