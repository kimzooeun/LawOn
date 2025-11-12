package com.prinCipal.chatbot.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CounselLogRepository extends JpaRepository<CounselLog, Long> {

    // 오늘 날짜의 상담 수 (startTime이 오늘인 것만)
    @Query("SELECT COUNT(c) FROM CounselLog c WHERE DATE(c.startTime) = CURRENT_DATE")
    long countTodayCounselLogs();
}
