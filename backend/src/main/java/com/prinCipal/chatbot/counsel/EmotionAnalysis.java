package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
@Table(name="EmotionAnalysis")
@Getter
@NoArgsConstructor
public class EmotionAnalysis {

	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long analysisId;
	
	@ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private CounsellingSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_id")
    private CounsellingContent content;
	
    private String emotionLabel;

    private LocalDateTime analysisTime = LocalDateTime.now();

    private Boolean alertTriggered = false;
	
	
	@CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    
    @Builder
    public EmotionAnalysis(CounsellingSession session, CounsellingContent content, String emotionLabel, Boolean alertTriggered) {
    	this.session = session;
    	this.content = content;
    	this.emotionLabel = emotionLabel;
    	this.alertTriggered = alertTriggered;
    }
}
