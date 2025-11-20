package com.prinCipal.chatbot.admin;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// ✅ 팀원의 패키지 import
import com.prinCipal.chatbot.counsel.CompletionStatus; // 상태 Enum (이름 확인 필요)
import com.prinCipal.chatbot.counsel.CounsellingSession;
import com.prinCipal.chatbot.counsel.SessionRepository;
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CounselService {

    private final SessionRepository sessionRepository; // 팀원의 상담 저장소
    private final MemberRepository memberRepository;   // 회원 저장소

    // 상담 시작 (세션 생성)
    @Transactional
    public CounsellingSession startCounsel(Long userId) {
        // 1. 회원 정보 찾기
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없습니다. ID: " + userId));

        // 2. 상담 세션 생성 (팀원의 Entity Builder 사용)
        CounsellingSession session = CounsellingSession.builder()
                .member(member)
                .completionStatus(CompletionStatus.ONGOING) // 시작 상태 (Enum 값 확인 필요: ONGOING/START 등)
                .build();

        // 3. 저장
        return sessionRepository.save(session);
    }

    // 상담 종료 (상태 업데이트)
    @Transactional
    public void endCounsel(Long sessionId) {
        // 1. 세션 찾기
        CounsellingSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("상담 세션을 찾을 수 없습니다. ID: " + sessionId));

        // 2. 종료 시간 및 상태 업데이트 (Entity의 편의 메서드 사용)
        session.updateendTime(LocalDateTime.now());
        
        // ⚠️ 주의: CompletionStatus에 'COMPLETED' 혹은 'END'에 해당하는 값이 있는지 확인하세요.
        session.updateStatus(CompletionStatus.COMPLETED); 
    }
    
 // ▼▼▼ [필수 추가] 관리자용 전체 목록 조회 메서드 ▼▼▼
    @Transactional(readOnly = true) 
    public java.util.List<CounselLogDto> findAllAdminLogs(String username, String status) {
        
    	// 1. DB에서 필터링된 Entity 리스트 가져오기
        java.util.List<CounsellingSession> sessions;
        
        if (username != null && !username.isEmpty()) {
            // 닉네임(username)이 포함된 세션 찾기 (LIKE 검색)
            // Member 엔티티의 닉네임 필드가 'nickname'이라고 가정합니다.
            sessions = sessionRepository.findByMember_NicknameContainingIgnoreCase(username);
        } else if (status != null && !status.isEmpty()) {
            // 상태(Status) 필터링
            // CompletionStatus Enum 타입과 일치해야 합니다.
            sessions = sessionRepository.findByCompletionStatus(CompletionStatus.valueOf(status));
        } else {
            // 조건이 없으면 전체 조회
            sessions = sessionRepository.findAll(); 
        }
        
        // ... (DTO 변환 로직은 그대로 유지) ...
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        
        return sessions.stream().map(session -> {
            // ... (기존 DTO 변환 로직) ...
            return CounselLogDto.fromEntity(session);
        }).collect(java.util.stream.Collectors.toList());
}
}    
    