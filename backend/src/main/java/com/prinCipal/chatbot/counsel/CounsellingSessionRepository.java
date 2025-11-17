package com.prinCipal.chatbot.counsel;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CounsellingSessionRepository extends JpaRepository<CounsellingSession, Long> {

    // 최근 상담 20개
    List<CounsellingSession> findTop20ByOrderByStartTimeDesc();

    // 오늘 상담 카운트
    long countByStartTimeBetween(LocalDateTime start, LocalDateTime end);

    // 전체 상담 수
    long count();
}
