package com.prinCipal.chatbot.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContentRepository extends JpaRepository<CounsellingContent, Long> {
    // CounsellingContent는 특별한 조회 조건이 당장 필요하지 않을 수 있습니다.
}
