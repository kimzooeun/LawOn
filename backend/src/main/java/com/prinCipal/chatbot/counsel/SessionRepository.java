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

@Repository
public interface SessionRepository extends JpaRepository<CounsellingSession, Long> {
    
	// 사용자가 소유한 세션인지 확인하기 위해 Member로 찾는 기능
    Optional<CounsellingSession> findBySessionIdAndMember(Long sessionId, Member member);
    
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDesc(@Param("member") Member member);
    
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDescWithContents(@Param("member") Member member);

	Collection<CounselLogDto> findTop20ByOrderByStartTimeDesc();
	
	/**
     * 1. 경고 대상 조회
     * 조건:
     * - 상태가 'ONGOING' (진행 중)
     * - 경고를 아직 안 보냄 (warningSent = false)
     * - 마지막 메시지 시간이 기준 시간(time)보다 '이전' (lastMessageTime < time)
     */
    @Query("SELECT s FROM CounsellingSession s WHERE s.completionStatus = 'ONGOING' AND s.warningSent = false AND s.lastMessageTime <= :time")
    List<CounsellingSession> findSessionsForWarning(@Param("time") LocalDateTime time);

    /**
     * 2. 타임아웃 대상 조회
     * 조건:
     * - 상태가 'ONGOING' (진행 중)
     * - (경고 발송 여부와 상관없이)
     * - 마지막 메시지 시간이 기준 시간(time)보다 '이전' (lastMessageTime < time)
     */
    @Query("SELECT s FROM CounsellingSession s WHERE s.completionStatus = 'ONGOING' AND s.lastMessageTime <= :time")
    List<CounsellingSession> findSessionsForTimeout(@Param("time") LocalDateTime time);
    
}