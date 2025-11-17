package com.prinCipal.chatbot.counsel;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
@Table(name="CounsellingContent")
@Getter
@NoArgsConstructor
public class CounsellingContent {

	 @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	 private Long contentId;
	 
	 @ManyToOne(fetch = FetchType.LAZY)
	 @JoinColumn(name = "session_id")
	 private CounsellingSession session;
	 
	 @Enumerated(EnumType.STRING)
	 @Column(nullable = false)
	 private Sender sender;
	 
	 @Column(columnDefinition = "TEXT", nullable = false)
	 private String content;
	 
	 private Boolean isDivorce;
     private String divorceCategory;
     private String emotionLabel;
     private Boolean alertTriggered = false;

     @CreationTimestamp
     private LocalDateTime createdAt;

     @UpdateTimestamp
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
