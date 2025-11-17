package com.prinCipal.chatbot.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface CounselLogRepository extends JpaRepository<CounselLog, Long> {

    // 🔹 최신 상담 20개 (대시보드 최근 이용 내역용)
    List<CounselLog> findTop20ByOrderByStartTimeDesc();

    // 🔹 오늘 시작된 상담 수
    long countByStartTimeAfter(LocalDateTime dateTime);

    // 🔹 전체 상담 수
    long count();
}
