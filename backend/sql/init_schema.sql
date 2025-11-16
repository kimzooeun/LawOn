CREATE DATABASE IF NOT EXISTS lawcounsel_db
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lawcounsel_db;


ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'principalC';
FLUSH PRIVILEGES;
SET FOREIGN_KEY_CHECKS=0;


-- 사용자 정보 테이블
CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    
    -- ▼ [추가] 소셜 로그인용 컬럼 3개
    social_provider VARCHAR(50) DEFAULT NULL,
    social_id VARCHAR(255) DEFAULT NULL UNIQUE,
    profile_image_url VARCHAR(255) DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 상담 세션 테이블
CREATE TABLE counselling_session (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT DEFAULT NULL,
    start_time  DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    duration_sec INT GENERATED ALWAYS AS (TIMESTAMPDIFF(SECOND, start_time, end_time)) STORED, 
    completion_status ENUM('ONGOING', 'PAUSED', 'COMPLETED', 'TIMEOUT', 'CANCELLED') DEFAULT 'ONGOING' NOT NULL, 
    last_message_time DATETIME DEFAULT NULL,           
    -- 마지막 사용자 or 챗봇 메시지 시각 → 타임아웃 판단 가능
    summary_title TEXT DEFAULT NULL,
    summary TEXT DEFAULT NULL,
    resume_token VARCHAR(100) DEFAULT NULL,                
    -- 재개용 토큰 (사용자가 이어서 대화할 때)
    -- 사용자가 “이전 대화 이어서 하기” 기능을 눌렀을 때 참조

    context_snapshot JSON DEFAULT NULL,                    
    -- 대화 맥락 저장 (챗봇 상태/기억 등) 
    -- LLM의 기억, 대화 요약, 감정 상태 같은 정보 JSON으로 저장 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL                           
);


-- 상담 콘텐츠
CREATE TABLE counselling_content (
    content_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT DEFAULT NULL,
    sender ENUM('USER', 'BOT') NOT NULL,
    content TEXT NOT NULL,
    is_divorce BOOLEAN DEFAULT NULL,
    divorce_category VARCHAR(100) DEFAULT NULL,
    emotion_label VARCHAR(50) DEFAULT NULL,
    alert_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES counselling_session(session_id) ON DELETE CASCADE
);


-- 감정 분석 결과
CREATE TABLE emotion_analysis (
    analysis_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT DEFAULT NULL,
    content_id BIGINT DEFAULT NULL,
    emotion_label VARCHAR(50) NOT NULL,
    analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    alert_triggered BOOLEAN DEFAULT FALSE,                        
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES counselling_session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES counselling_content(content_id) ON DELETE CASCADE   
);


-- 위기 알림 테이블
CREATE TABLE crisis_alert (
    alert_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT DEFAULT NULL, 
    session_id BIGINT DEFAULT NULL,                         
    analysis_id BIGINT DEFAULT NULL,    
  
    alert_severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW', 
    alert_status ENUM('PENDING', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED') DEFAULT 'PENDING' NOT NULL,          
    auto_escalate BOOLEAN DEFAULT FALSE,                 
    auto_escalated_to VARCHAR(100) DEFAULT NULL COMMENT '자동 연결된 담당자 ID 또는 팀명',
    auto_escalate_request_time DATETIME DEFAULT NULL,        -- 자동 연결 시도 시각  
    auto_escalate_response_time DATETIME DEFAULT NULL,     
    auto_escalate_result ENUM('SUCCESS', 'FAILED', 'TIMEOUT') DEFAULT NULL,
    alert_timestamp DATETIME DEFAULT NULL COMMENT '위기 감정이 감지된 실제 시각 (EmotionAnalysis.analysis_time 참조)',
  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES counselling_session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES emotion_analysis(analysis_id) ON DELETE CASCADE
);


SET FOREIGN_KEY_CHECKS=1;


-- 1번 테스트 사용자 추가
INSERT INTO users (user_id, nickname, display_name, password, user_role, social_provider) 
VALUES (1, 'testuser', 'testuser', '$2a$10$kEAO1hxQk3gPtXKBN6nsIOBKJC3aJGYAfZT4t5OcRlH1vtO0zgHLC', 'USER', 'local');

