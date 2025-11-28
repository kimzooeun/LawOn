package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import com.prinCipal.chatbot.admin.CounselLogDto;
import com.prinCipal.chatbot.member.Member;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<CounsellingSession, Long> {
    
	// 1. 세션 ID와 사용자 정보로 특정 세션 조회 (본인 확인용)
    Optional<CounsellingSession> findBySessionIdAndMember(Long sessionId, Member member);
    
    // 2. 사용자의 모든 세션 목록 조회 (최신순) - N+1 문제 해결을 위해 contents를 함께 로딩(JOIN FETCH) [cite: 1]
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDesc(@Param("member") Member member);
    
    // 3. 관리자 페이지용 최근 상담 로그 20개 조회
    Collection<CounselLogDto> findTop20ByOrderByStartTimeDesc();
	
    // 4. 스케줄러: 경고 메시지 발송 대상 조회 (설정된 시간 경과, 경고 미발송 상태) [cite: 1]
    @Query("SELECT s FROM CounsellingSession s WHERE s.completionStatus = :status AND s.warningSent = false AND s.lastMessageTime <= :time")
    List<CounsellingSession> findSessionsForWarning(@Param("status") CompletionStatus status, @Param("time") LocalDateTime time);

    // 5. 스케줄러: 타임아웃 자동 종료 대상 조회 (설정된 시간 경과, 경고 발송 완료 상태) [cite: 1]
    @Query("SELECT s FROM CounsellingSession s WHERE s.completionStatus = :status AND s.warningSent = true AND s.lastMessageTime <= :time")
    List<CounsellingSession> findSessionsForTimeout(@Param("status") CompletionStatus status, @Param("time") LocalDateTime time);

    // 정민 추가 어드민 대시보드용 통계 메서드  
    // 특정 기간 사이의 상담 수 (오늘 상담 수 구할 때 사용)
    long countByStartTimeBetween(LocalDateTime start, LocalDateTime end);

    // 특정 시간 이후의 상담 수
    long countByStartTimeAfter(LocalDateTime dateTime);
    
    @Query("SELECT s FROM CounsellingSession s JOIN FETCH s.member ORDER BY s.id DESC")
    List<CounsellingSession> findAllWithMember();
    
    // 1. 닉네임 검색 (JPA Query Method: Member 엔티티의 nickname 필드를 검색)
    List<CounsellingSession> findByMember_NicknameContainingIgnoreCase(String nickname);
    
    // 2. 상태(Status) 검색
    List<CounsellingSession> findByCompletionStatus(CompletionStatus status);
    
    /**
     * 관리자 로그 검색용 동적 쿼리
     * nickname이나 status가 null이면 해당 조건은 무시하고 전체 검색
     */
    @Query("SELECT s FROM CounsellingSession s " +
           "JOIN FETCH s.member m " +
           "WHERE (:nickname IS NULL OR m.nickname LIKE %:nickname%) " +
           "AND (:status IS NULL OR s.completionStatus = :status) " +
           "ORDER BY s.startTime DESC")
    List<CounsellingSession> findAdminLogsByFilter(
        @Param("nickname") String nickname, 
        @Param("status") CompletionStatus status
    );
	
}