package com.prinCipal.chatbot.content;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.counsel.CounsellingSession;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name="counselling_content")
public class CounsellingContent {

	 @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	 @Column(name = "content_id")
	 private Long contentId;
	 
	 @ManyToOne(fetch = FetchType.LAZY)
	 @JoinColumn(name = "session_id")
	 private CounsellingSession session;
	 
	 @Enumerated(EnumType.STRING)
	 @Column(nullable = false)
	 private Sender sender;
	 
	 @Column(columnDefinition = "TEXT", nullable = false)
	 private String content;
	 
	 @Column(name = "is_divorce")
	 private Boolean isDivorce;
	 
	 @Column(name = "divorce_category")
     private String divorceCategory;
	 
	 @Column(name = "emotion_label")
     private String emotionLabel;
	 
	 @Column(name = "alert_triggered")
     private Boolean alertTriggered = false;

     @CreationTimestamp
     @Column(name = "created_at")
     private LocalDateTime createdAt;

     @UpdateTimestamp
     @Column(name = "updated_at")
     private LocalDateTime updatedAt;
     
     @Builder
     public CounsellingContent(CounsellingSession session, Sender sender, String content, Boolean isDivorce,String divorceCategory,
    		 String emotionLabel,Boolean alertTriggered) {
    	 this.session = session;
    	 this.sender = sender;
    	 this.content = content;
    	 this.isDivorce = isDivorce;
    	 this.alertTriggered = alertTriggered;
    	 this.divorceCategory = divorceCategory;
    	 this.emotionLabel = emotionLabel;
     }
	    
	   
}
