package com.prinCipal.chatbot.content;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.counsel.CounsellingSession;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
@Table(name = "keyword_analysis")
@Getter
@NoArgsConstructor
public class KeywordAnalysis {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "analysis_id")
	private Long analysisId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "session_id")
	private CounsellingSession session;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "content_id", unique = true)
	private CounsellingContent content;

	@Column(name = "is_divorce")
	private Boolean isDivorce;

	@Column(name = "emotion_label", nullable = false)
	private String emotionLabel;

	@Column(name = "topic")
	private String topic;

	@Column(name = "intent")
	private String intent;

	@Column(name = "situation")
	private String situation;

	@Column(name = "retrieved_data", columnDefinition = "JSON")
	private String retrievedData;

	@Column(name = "analysis_time")
	private LocalDateTime analysisTime = LocalDateTime.now();

	@Column(name = "alert_triggered")
	private Boolean alertTriggered = false;

//	@CreationTimestamp
//	@Column(name = "created_at")
//	private LocalDateTime createdAt;
//
//	@UpdateTimestamp
//	@Column(name = "updated_at")
//	private LocalDateTime updatedAt;

	@Builder
	public KeywordAnalysis(CounsellingSession session, CounsellingContent content, Boolean isDivorce,
			String emotionLabel, String topic, String intent, String situation, String retrievedData,
			Boolean alertTriggered) {
		this.session = session;
		this.content = content;
		this.isDivorce = isDivorce;
		this.emotionLabel = emotionLabel;
		this.topic = topic;
		this.intent = intent;
		this.situation = situation;
		this.retrievedData = retrievedData;
		this.alertTriggered = alertTriggered;
	}
	
	// 위기 감정 발생 업데이트
	public void updatealertTriggered(Boolean alertTriggered) {
		this.alertTriggered = alertTriggered;
	}
	
}
