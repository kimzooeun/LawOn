CREATE DATABASE IF NOT EXISTS lawcounsel_db
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lawcounsel_db;


ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'principalC';
FLUSH PRIVILEGES;

-- 사용자 정보 테이블
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    preferred_color ENUM('PINK','PURPLE','YELLOW','BLUE') DEFAULT 'PURPLE',
    divorce_stage_type_id INT DEFAULT NULL,
    personality_type VARCHAR(20) DEFAULT NULL,
    emergency_contact VARCHAR(11) DEFAULT NULL,
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    FOREIGN KEY (divorce_stage_type_id) REFERENCES DivorceStageType(stage_type_id)
);

-- 상담 세션 테이블
CREATE TABLE CounsellingSession (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_time  DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    duration_sec INT GENERATED ALWAYS AS (TIMESTAMPDIFF(SECOND, start_time, end_time)) STORED, 
    current_divorce_stage_id INT DEFAULT NULL,
    status ENUM('ONGOING', 'PAUSED', 'COMPLETED', 'TIMEOUT', 'CANCELLED') DEFAULT 'ONGOING' NOT NULL, 
    last_message_time DATETIME DEFAULT NULL,           
    -- 마지막 사용자 or 챗봇 메시지 시각 → 타임아웃 판단 가능
    summary TEXT DEFAULT NULL,
    resume_token VARCHAR(100) DEFAULT NULL,                
    -- 재개용 토큰 (사용자가 이어서 대화할 때)
    -- 사용자가 “이전 대화 이어서 하기” 기능을 눌렀을 때 참조

    context_snapshot JSON DEFAULT NULL,                    
    -- 대화 맥락 저장 (챗봇 상태/기억 등) 
    -- LLM의 기억, 대화 요약, 감정 상태 같은 정보 JSON으로 저장 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (current_divorce_stage_id) REFERENCES DivorceStage(stage_id)                                   
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
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_ms INT GENERATED ALWAYS AS (TIMESTAMPDIFF(MICROSECOND, start_time, end_time) / 1000) STORED,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES CounsellingSession(session_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);


-- 감정 분석 결과
CREATE TABLE EmotionAnalysis (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    content_id INT NOT NULL,
    emotion_label VARCHAR(50) NOT NULL,
    analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    alert_triggered BOOLEAN DEFAULT FALSE,                        
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES CounsellingSession(session_id),
    FOREIGN KEY (content_id) REFERENCES CounsellingContent(content_id)    
);


-- 상담 콘텐츠
CREATE TABLE CounsellingContent (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    sender ENUM('USER', 'BOT') NOT NULL,
    content TEXT NOT NULL,
    related_stage_divorce_id INT DEFAULT NULL,
    is_divorce BOOLEAN DEFAULT NULL,
    divorce_category VARCHAR(100) DEFAULT NULL,
    emotion_label VARCHAR(50) DEFAULT NULL,
    alert_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES CounsellingSession(session_id),
    FOREIGN KEY (related_stage_divorce_id) REFERENCES DivorceStage(stage_id)
);

CREATE TABLE DivorceStageType (
    stage_type_id INT AUTO_INCREMENT PRIMARY KEY,
    stage_code VARCHAR(50) NOT NULL UNIQUE,
    stage_name VARCHAR(100) NOT NULL,
    stage_description TEXT DEFAULT NULL,
    order_index INT DEFAULT NULL
);

CREATE TABLE DivorceStage (
    stage_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stage_type_id INT NOT NULL COMMENT '현재 이혼 단계 (FK → DivorceStageType)',
    stage_note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (stage_type_id) REFERENCES DivorceStageType(stage_type_id)
);

CREATE TABLE CrisisTypeCode (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,   -- 예: 'SUICIDAL', 'PANIC'
    type_description VARCHAR(255) DEFAULT NULL,   -- 예: '자살 의도 감지'
    is_active BOOLEAN DEFAULT TRUE
);


-- 위기 알림 테이블
CREATE TABLE CrisisAlert (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT DEFAULT NULL,                         
    analysis_id INT DEFAULT NULL,    
    type_id INT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW', 
    alert_status ENUM('PENDING', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED') DEFAULT 'PENDING' NOT NULL,          
    auto_escalate BOOLEAN DEFAULT FALSE,                 
    auto_escalated_to VARCHAR(100) DEFAULT NULL COMMENT '자동 연결된 담당자 ID 또는 팀명',
    auto_escalate_time DATETIME DEFAULT NULL,        -- 자동 연결 시도 시각  
    auto_escalate_response_time DATETIME DEFAULT NULL,     
    auto_escalate_result ENUM('SUCCESS', 'FAILED', 'TIMEOUT') DEFAULT NULL,
    alert_timestamp DATETIME DEFAULT NULL COMMENT '위기 감정이 감지된 실제 시각 (EmotionAnalysis.analysis_time 참조)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (session_id) REFERENCES CounsellingSession(session_id),
    FOREIGN KEY (analysis_id) REFERENCES EmotionAnalysis(analysis_id),
    FOREIGN KEY (type_id) REFERENCES CrisisTypeCode(type_id)
);




