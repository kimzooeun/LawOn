package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.prinCipal.chatbot.admin.CounselLogDto;
import com.prinCipal.chatbot.member.Member;

import io.lettuce.core.dynamic.annotation.Param;

@Repository
public interface SessionRepository extends JpaRepository<CounsellingSession, Long> {
    
	// 사용자가 소유한 세션인지 확인하기 위해 Member로 찾는 기능
    Optional<CounsellingSession> findBySessionIdAndMember(Long sessionId, Member member);
    
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDesc(@Param("member") Member member);
    
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDescWithContents(@Param("member") Member member);

	Collection<CounselLogDto> findTop20ByOrderByStartTimeDesc();
	
	// 경고 대상 조회: 진행 중(ONGOING) + 경고 안 보냄(false) + 마지막 대화가 5분 전
    @Query("SELECT s FROM CounsellingSession s WHERE s.completionStatus = 'ONGOING' AND s.warningSent = false AND s.lastMessageTime < :targetTime")
    List<CounsellingSession> findSessionsForWarning(@Param("targetTime") LocalDateTime targetTime);

    // 종료 대상 조회: 진행 중(ONGOING) + 마지막 대화가 10분 전 (경고 여부 상관X)
    @Query("SELECT s FROM CounsellingSession s WHERE s.completionStatus = 'ONGOING' AND s.lastMessageTime < :targetTime")
    List<CounsellingSession> findSessionsForTimeout(@Param("targetTime") LocalDateTime targetTime);
    
}