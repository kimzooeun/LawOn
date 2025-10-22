CREATE DATABASE IF NOT EXISTS lawcounsel_db
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lawcounsel_db;

-- 사용자 정보 테이블
CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    preferred_color ENUM('PINK','PURPLE','YELLOW','BLUE') DEFAULT 'PURPLE',
    divorce_stage_id ENUM('CONSIDERATION','PROCEEDING','COMPLETION','ADAPTATION') DEFAULT NULL,
    personality_type VARCHAR(20) DEFAULT NULL,
    emergency_contact VARCHAR(11) DEFAULT NULL,
    role ENUM('USER', 'ADMIN', 'COUNSELOR') DEFAULT 'USER',
    created_at  DATETIME(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME(6) DEFAULT NULL,
);

-- 상담 세션 테이블
CREATE TABLE CounsellingSession (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_time  DATETIME(6) NOT NULL,
    end_time DATETIME(6) DEFAULT NULL,
    duration_sec INT GENERATED ALWAYS AS (TIMESTAMPDIFF(SECOND, start_time, end_time)) STORED, 

    status ENUM('ONGOING', 'PAUSED', 'COMPLETED', 'TIMEOUT', 'CANCELLED') 
        DEFAULT 'ONGOING' NOT NULL, 
    last_message_time DATETIME(6) DEFAULT NULL,           
    -- 마지막 사용자 or 챗봇 메시지 시각 → 타임아웃 판단 가능

    resume_token VARCHAR(100) DEFAULT NULL,                
    -- 재개용 토큰 (사용자가 이어서 대화할 때)
    -- 사용자가 “이전 대화 이어서 하기” 기능을 눌렀을 때 참조

    context_snapshot JSON DEFAULT NULL,                    
    -- 대화 맥락 저장 (챗봇 상태/기억 등) 
    -- LLM의 기억, 대화 요약, 감정 상태 같은 정보 JSON으로 저장                    
  
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),  
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) 
        ON UPDATE CURRENT_TIMESTAMP(6)                   
);


-- 음성 상호작용 로그
CREATE TABLE VoiceInteraction (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    voice_file_path VARCHAR(255),
    transcript_text TEXT,
    response_text TEXT,
    intent VARCHAR(100),
    start_time DATETIME(6) NOT NULL,
    end_time DATETIME(6),
    duration_ms INT GENERATED ALWAYS AS (TIMESTAMPDIFF(MICROSECOND, start_time, end_time) / 1000) STORED,  
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);


-- 챗봇 발화 로그 
CREATE TABLE ChatMessageLog (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    sender ENUM('USER', 'BOT') NOT NULL,
    message_text TEXT NOT NULL,
    intent VARCHAR(100),
    emotion_label VARCHAR(50),
    confidence FLOAT,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
    -- 후에 상담 세션의 session_id와의 외래키 
);


-- 감정 분석 결과
CREATE TABLE EmotionAnalysis (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,

    source ENUM('TEXT', 'VOICE', 'CHAT', 'SUMMARY') DEFAULT 'TEXT', 
    -- 감정 분석 출처(텍스트/음성 등)
    emotion_label VARCHAR(50),
    emotion_score JSON DEFAULT NULL, 
    analysis_time DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    text_data TEXT DEFAULT NULL,    
    tags VARCHAR(255) DEFAULT NULL,
    alert_triggered BOOLEAN DEFAULT FALSE,                        
    -- 위기 감정 감지 시 알림 트리거 여부
    confidence FLOAT DEFAULT NULL,      
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    -- 후에 상담 세션의 session_id와의 외래키 
);

-- 위기 알림 테이블
CREATE TABLE CrisisAlert (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT DEFAULT NULL,                         
    analysis_id INT DEFAULT NULL,    
    
    alert_type VARCHAR(50) NOT NULL,-- 알림 유형 (예: 'suicidal', 'panic', 'violence')
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW', 
    -- 위기 수준
    alert_timestamp DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6), 
    alert_status ENUM('PENDING', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED') DEFAULT 'PENDING' NOT NULL,                     
    auto_escalate BOOLEAN DEFAULT FALSE,                 
    auto_escalated_to VARCHAR(100) DEFAULT NULL,      
    auto_escalate_time DATETIME(6) DEFAULT NULL,        -- 자동 연결 시도 시각  
    auto_escalate_response_time DATETIME(6) DEFAULT NULL,     
    auto_escalate_result ENUM('SUCCESS', 'FAILED', 'TIMEOUT') DEFAULT NULL,
    
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) 
        ON UPDATE CURRENT_TIMESTAMP(6),

    -- 후에 session_id와, analysis_id 외래키연결 
    -- 후에 type_code와alert_type 외래키 연결
);

CREATE TABLE AlertType (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,   -- 예: 'SUICIDAL', 'PANIC'
    description VARCHAR(255) DEFAULT NULL,   -- 예: '자살 의도 감지'
    is_active BOOLEAN DEFAULT TRUE
);


-- 이혼 단계별 정보
CREATE TABLE DivorceStage (
    stage_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    descriptions TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 상담 콘텐츠 (대화/문서 요약 등)
CREATE TABLE CounsellingContent (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    title VARCHAR(200) NOT NULL, 
    summary TEXT DEFAULT NULL,
    related_stage_divorce_id INT DEFAULT NULL,
    content_type ENUM('TEXT', 'SUMMARY', 'ADVICE', 'LEGAL_GUIDE') DEFAULT 'TEXT',
    content TEXT,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    -- 후에 session_id 연결, related_stage_divorce_id 연결
);
