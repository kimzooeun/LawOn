package com.prinCipal.chatbot.alert;
import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.prinCipal.chatbot.counsel.CounsellingSession;
import com.prinCipal.chatbot.counsel.EmotionAnalysis;
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
@Table(name="CrisisAlert")
@Getter
@NoArgsConstructor
public class CrisisAlert {
	
	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long alertId;
	
	@ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private Member member;
	
	@ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private CounsellingSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id")
    private EmotionAnalysis analysis;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_id", nullable = false)
    private CrisisTypeCode crisisTypeCode;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity alertSeverity;

    @Enumerated(EnumType.STRING)
    private AlertStatus alertStatus = AlertStatus.PENDING;

    private Boolean autoEscalate = false;
    private String autoEscalatedTo;
    
    @Enumerated(EnumType.STRING)
    private EscalateResult autoEscalateResult;

   
    private LocalDateTime autoEscalateRequestTime;
    private LocalDateTime autoEscalateResponseTime;
    private LocalDateTime alertTimestamp;
    
	@CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @Builder
    public CrisisAlert(Member member, CounsellingSession session,EmotionAnalysis analysis,
    		CrisisTypeCode crisisTypeCode,AlertSeverity alertSeverity,AlertStatus alertStatus,
    		Boolean autoEscalate,String autoEscalatedTo,EscalateResult autoEscalateResult) {
    	
    }
}









