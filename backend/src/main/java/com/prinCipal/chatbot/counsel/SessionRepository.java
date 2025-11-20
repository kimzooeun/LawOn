package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.admin.CounselLogDto;
import com.prinCipal.chatbot.member.Member;

import io.lettuce.core.dynamic.annotation.Param;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<CounsellingSession, Long> {
    
	// 사용자가 소유한 세션인지 확인하기 위해 Member로 찾는 기능
    Optional<CounsellingSession> findBySessionIdAndMember(Long sessionId, Member member);
    
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDesc(@Param("member") Member member);
    
    @Query("SELECT DISTINCT s FROM CounsellingSession s LEFT JOIN FETCH s.contents WHERE s.member = :member ORDER BY s.lastMessageTime DESC")
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDescWithContents(@Param("member") Member member);

	Collection<CounselLogDto> findTop20ByOrderByStartTimeDesc();
    
	
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
	
}