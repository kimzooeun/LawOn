package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.content.CounsellingContent;

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
@Table(name="emotion_analysis")
@Getter
@NoArgsConstructor
public class EmotionAnalysis {

	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "analysis_id")
	private Long analysisId;
	
	@ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private CounsellingSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_id")
    private CounsellingContent content;
	
	@Column(name = "emotion_label", nullable = false)
    private String emotionLabel;

	@Column(name = "analysis_time")
    private LocalDateTime analysisTime = LocalDateTime.now();

	@Column(name = "alert_triggered")
    private Boolean alertTriggered = false;
	
	
	@CreationTimestamp
	@Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
	@Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    
    @Builder
    public EmotionAnalysis(CounsellingSession session, CounsellingContent content, String emotionLabel, Boolean alertTriggered) {
    	this.session = session;
    	this.content = content;
    	this.emotionLabel = emotionLabel;
    	this.alertTriggered = alertTriggered;
    }
}
